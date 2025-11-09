import { prisma } from '../db.js';
import paymentService from './PaymentService.js';

function generateRmaNumber() {
  return `RMA-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

export const RmaService = {
  async createReturnRequest({ saleId, userId, reason, details, items = [] }) {
    // Basic validation: sale exists and belongs to user
    const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { buyer: true, items: true, payment: true } });
    if (!sale) throw new Error('Sale not found');
    if (sale.buyerId !== userId) throw new Error('Return request must be created by the original buyer');

    const rmaNumber = generateRmaNumber();

    const created = await prisma.returnRequest.create({
      data: {
        rmaNumber,
        sale: {
          connect: { id: saleId }
        },
        user: {
          connect: { id: userId }
        },
        reason: reason || '',
        details: details || '',
        items: {
          create: (items || []).map(it => ({
            saleItem: it.saleItemId ? {
              connect: { id: it.saleItemId }
            } : undefined,
            quantity: it.quantity || 1,
            conditionNotes: it.conditionNotes || ''
          }))
        }
      }
    });

    return created;
  },

  async getReturnRequestsForUser(userId) {
    return prisma.returnRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  },

  async getAllReturnRequests() {
    return prisma.returnRequest.findMany({ 
      orderBy: { createdAt: 'desc' }, 
      include: { 
        user: true, 
        sale: { include: { payment: true } }, 
        items: { include: { saleItem: true } },
        refunds: true,
        inspections: true,
        shipments: true
      } 
    });
  },

  async getById(id) {
    return prisma.returnRequest.findUnique({
      where: { id },
      include: {
        user: true,
        sale: { include: { payment: true } },
        items: { include: { saleItem: true } },
        refunds: true,
        inspections: true,
        shipments: true,
        auditLogs: true
      }
    });
  },

  async authorizeReturn(id, action, actorId, message) {
    // action: 'authorize' | 'reject'
    const status = action === 'authorize' ? 'APPROVED_AWAITING_SHIPMENT' : 'REJECTED';
    const updated = await prisma.returnRequest.update({ where: { id }, data: { status } });
    await prisma.rmaAuditLog.create({ data: { returnRequestId: id, actorId: actorId || null, action: `authorize:${action}`, message: message || null } });
    return updated;
  },

  async addInspection(returnRequestId, inspectorId, result, notes) {
    const ins = await prisma.inspection.create({ data: { returnRequestId, inspectorId: inspectorId || null, result, notes: notes || null } });
    await prisma.rmaAuditLog.create({ data: { returnRequestId, actorId: inspectorId || null, action: `inspect:${result}`, message: notes || null } });
    return ins;
  },

  async issueRefund({ returnRequestId, amountMinor, method = 'ORIGINAL_PAYMENT', currency = 'AED', reason = '', paymentId = null, actorId = null }) {
    // Use paymentService to refund where possible (if paymentId provided)
    let refundRef = null;
    let refundStatus = 'DECLINED';

    // Handle refund flows including STORE_CREDIT and ORIGINAL_PAYMENT
    let created;
    try {
      if (method === 'STORE_CREDIT') {
        // Issue store credit to the user atomically
        const r = await prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
        if (!r) throw new Error('Return request not found');

        await prisma.$transaction(async (tx) => {
          // Create refund record
          created = await tx.refund.create({
            data: {
              returnRequestId,
              paymentId: null,
              method,
              amountMinor,
              currency,
              reason: reason || null,
              refundRef: `CREDIT_${Date.now()}`,
              status: 'APPROVED',
              processedAt: new Date()
            }
          });

          // Credit the user's account
          await tx.user.update({ where: { id: r.userId }, data: { creditMinor: { increment: amountMinor } } });

          // Update sale refunded total and mark sale refunded
          const sale = await tx.sale.findUnique({ where: { id: r.saleId } });
          if (sale) {
            await tx.sale.update({ where: { id: sale.id }, data: { refundedMinorTotal: (sale.refundedMinorTotal || 0) + amountMinor, status: 'REFUNDED' } });
          }

          // Mark RMA completed and set creditIssuedAt
          await tx.returnRequest.update({ where: { id: returnRequestId }, data: { status: 'COMPLETED', completedAt: new Date(), creditIssuedAt: new Date() } });
        });
        refundStatus = 'APPROVED';
      } else if (paymentId) {
        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (payment && payment.approvalRef) {
          // call adapter to refund
          const adapterResult = await paymentService.refundPayment(payment.approvalRef, amountMinor);
          refundRef = adapterResult.refundId || adapterResult.transactionId || null;
          refundStatus = adapterResult.success ? 'APPROVED' : 'DECLINED';

          created = await prisma.refund.create({
            data: {
              returnRequestId,
              paymentId: paymentId || null,
              method,
              amountMinor,
              currency,
              reason: reason || null,
              refundRef,
              status: refundStatus,
              processedAt: adapterResult.timestamp ? new Date(adapterResult.timestamp) : new Date()
            }
          });
        } else {
          refundStatus = 'DECLINED';
        }
      } else {
        // Manual refund through admin interface (no paymentId)
        refundStatus = 'APPROVED';
        created = await prisma.refund.create({ data: { returnRequestId, paymentId: null, method, amountMinor, currency, reason: reason || null, refundRef: '', status: refundStatus, processedAt: new Date() } });
        await prisma.returnRequest.update({ where: { id: returnRequestId }, data: { status: 'COMPLETED', completedAt: new Date() } });
      }
    } catch (err) {
      // If anything fails, record a declined refund
      refundStatus = 'DECLINED';
      if (!created) {
        created = await prisma.refund.create({ data: { returnRequestId, paymentId: paymentId || null, method, amountMinor, currency, reason: reason || null, refundRef: refundRef || '', status: refundStatus } });
      }
    }

    // Ensure audit log
    await prisma.rmaAuditLog.create({ data: { returnRequestId, actorId: actorId || null, action: 'refund:issued', message: `Refund ${created.id} ${refundStatus}` } });

    return created;
  }
};

export default RmaService;
