import { prisma } from '../db.js';
import paymentService from './PaymentService.js';

const RETURN_REASONS = {
  DEFECTIVE: 'item is defected',
  NOT_EXPECTED: 'item is not what they were expecting'
};

function normalizeReturnReason(input) {
  const value = (input || '').trim();
  if (!value) {
    throw new Error('Return reason is required');
  }
  const match = Object.values(RETURN_REASONS).find(reason => reason.toLowerCase() === value.toLowerCase());
  if (!match) {
    throw new Error('Invalid return reason');
  }
  return match;
}

function sanitizeDetails(value) {
  return (value || '').trim();
}

function sanitizeQuantity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }
  return Math.floor(numeric);
}

function generateRmaNumber() {
  return `RMA-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

export const RmaService = {
  async createReturnRequest({ saleId, userId, reason, details, items = [] }) {
    const normalizedReason = normalizeReturnReason(reason);
    const cleanedDetails = sanitizeDetails(details);

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item must be selected for return');
    }

    // Basic validation: sale exists and belongs to user
    const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { buyer: true, items: true } });
    if (!sale) throw new Error('Sale not found');
    if (sale.buyerId !== userId) throw new Error('Return request must be created by the original buyer');

    const createItems = items.map((item) => {
      const matchingSaleItem = sale.items.find(si => si.id === item.saleItemId);
      if (!matchingSaleItem) {
        throw new Error('Invalid return item selected');
      }
      const quantity = Math.min(matchingSaleItem.quantity, sanitizeQuantity(item.quantity));
      return {
        saleItemId: matchingSaleItem.id,
        quantity,
        conditionNotes: sanitizeDetails(item.conditionNotes)
      };
    });

    const rmaNumber = generateRmaNumber();

    const created = await prisma.returnRequest.create({
      data: {
        rmaNumber,
        saleId,
        userId,
        reason: normalizedReason,
        details: cleanedDetails,
        items: {
          create: createItems
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
    const cleanedRefundReason = sanitizeDetails(reason);
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        sale: { select: { id: true, refundedMinorTotal: true } },
        items: { include: { saleItem: true } }
      }
    });

    if (!returnRequest) {
      throw new Error('Return request not found');
    }

    let refundRef = null;
    let refundStatus = 'DECLINED';
    let created;

    try {
      if (method === 'STORE_CREDIT') {
        created = await prisma.$transaction(async (tx) => {
          const refundRecord = await tx.refund.create({
            data: {
              returnRequestId,
              paymentId: null,
              method,
              amountMinor,
              currency,
              reason: cleanedRefundReason,
              refundRef: `CREDIT_${Date.now()}`,
              status: 'APPROVED',
              processedAt: new Date()
            }
          });

          await tx.user.update({ where: { id: returnRequest.userId }, data: { creditMinor: { increment: amountMinor } } });
          await finalizeReturn(tx, returnRequest, { amountMinor, method });
          return refundRecord;
        });
        refundStatus = 'APPROVED';
      } else if (paymentId) {
        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment || !payment.approvalRef) {
          throw new Error('Payment reference not found for refund');
        }

        const adapterResult = await paymentService.refundPayment(payment.approvalRef, amountMinor);
        refundRef = adapterResult.refundId || adapterResult.transactionId || null;
        refundStatus = adapterResult.success ? 'APPROVED' : 'DECLINED';

        created = await prisma.$transaction(async (tx) => {
          const refundRecord = await tx.refund.create({
            data: {
              returnRequestId,
              paymentId,
              method,
              amountMinor,
              currency,
              reason: cleanedRefundReason,
              refundRef,
              status: refundStatus,
              processedAt: adapterResult.timestamp ? new Date(adapterResult.timestamp) : new Date()
            }
          });

          if (refundStatus === 'APPROVED') {
            await finalizeReturn(tx, returnRequest, { amountMinor, method });
          }

          return refundRecord;
        });
      } else {
        created = await prisma.$transaction(async (tx) => {
          const refundRecord = await tx.refund.create({
            data: {
              returnRequestId,
              paymentId: null,
              method,
              amountMinor,
              currency,
              reason: cleanedRefundReason,
              refundRef: '',
              status: 'APPROVED',
              processedAt: new Date()
            }
          });

          await finalizeReturn(tx, returnRequest, { amountMinor, method });
          return refundRecord;
        });
        refundStatus = 'APPROVED';
      }
    } catch (err) {
      console.error('issueRefund error:', err);
      refundStatus = 'DECLINED';

      if (!created) {
        created = await prisma.refund.create({
          data: {
            returnRequestId,
            paymentId: paymentId || null,
            method,
            amountMinor,
            currency,
            reason: cleanedRefundReason,
            refundRef: refundRef || '',
            status: 'DECLINED'
          }
        });
      } else if (created.status !== 'DECLINED') {
        created = await prisma.refund.update({
          where: { id: created.id },
          data: { status: 'DECLINED' }
        });
      }
    }

    await prisma.rmaAuditLog.create({ data: { returnRequestId, actorId: actorId || null, action: 'refund:issued', message: `Refund ${created.id} ${refundStatus}` } });

    return created;
  }
};

async function finalizeReturn(tx, returnRequest, { amountMinor, method }) {
  const latestRma = await tx.returnRequest.findUnique({
    where: { id: returnRequest.id },
    select: { status: true }
  });

  if (!latestRma) {
    throw new Error('Return request not found during finalization');
  }

  if (latestRma.status === 'COMPLETED') {
    return;
  }

  const saleRecord = await tx.sale.findUnique({
    where: { id: returnRequest.saleId },
    select: { refundedMinorTotal: true }
  });

  if (saleRecord) {
    await tx.sale.update({
      where: { id: returnRequest.saleId },
      data: {
        refundedMinorTotal: (saleRecord.refundedMinorTotal || 0) + amountMinor,
        status: 'REFUNDED'
      }
    });
  }

  const now = new Date();
  const rmaUpdate = {
    status: 'COMPLETED',
    completedAt: now
  };

  if (method === 'STORE_CREDIT') {
    rmaUpdate.creditIssuedAt = now;
  }

  await tx.returnRequest.update({
    where: { id: returnRequest.id },
    data: rmaUpdate
  });

  const items = returnRequest.items || [];

  if (returnRequest.reason === RETURN_REASONS.DEFECTIVE) {
    for (const item of items) {
      const productId = item.saleItem?.productId;
      if (!productId) continue;
      const quantity = sanitizeQuantity(item.quantity);

      await tx.defectiveItems.upsert({
        where: {
          returnRequestId_productId: {
            returnRequestId: returnRequest.id,
            productId
          }
        },
        update: {
          stock: { increment: quantity }
        },
        create: {
          returnRequestId: returnRequest.id,
          productId,
          stock: quantity
        }
      });
    }
  } else if (returnRequest.reason === RETURN_REASONS.NOT_EXPECTED) {
    for (const item of items) {
      const productId = item.saleItem?.productId;
      if (!productId) continue;
      const quantity = sanitizeQuantity(item.quantity);

      await tx.product.update({
        where: { id: productId },
        data: {
          stock: { increment: quantity }
        }
      });
    }
  }

  returnRequest.status = 'COMPLETED';
  if (returnRequest.sale) {
    returnRequest.sale.refundedMinorTotal = (returnRequest.sale.refundedMinorTotal || 0) + amountMinor;
  }
}

export default RmaService;
