import express from 'express';
import pkg from 'express-openid-connect';
const { requiresAuth } = pkg;
import { RmaService } from '../services/rmaService.js';
import { prisma } from '../db.js';

const router = express.Router();

const requireAdmin = (req, res, next) => {
  const adminEmails = ['izahs2003@gmail.com', 'tj2286@nyu.edu'];
  if (adminEmails.includes(req.oidc?.user?.email)) return next();
  return res.status(403).json({ error: 'Admin access required' });
};

// Create a return request
router.post('/', requiresAuth(), async (req, res) => {
  try {
    const userAuth0Id = req.oidc.user.sub;
    const user = await prisma.user.findUnique({ where: { auth0Id: userAuth0Id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { saleId, reason, details, items } = req.body;
    const created = await RmaService.createReturnRequest({ saleId, userId: user.id, reason, details, items });
    res.status(201).json({ success: true, rma: created });
  } catch (err) {
    console.error('POST /api/rma error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get user's return requests (or admin all)
router.get('/', requiresAuth(), async (req, res) => {
  try {
    const userAuth0Id = req.oidc.user.sub;
    const user = await prisma.user.findUnique({ where: { auth0Id: userAuth0Id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (['izahs2003@gmail.com','tj2286@nyu.edu'].includes(req.oidc.user.email)) {
      const all = await RmaService.getAllReturnRequests();
      return res.json({ success: true, rmas: all, returns: all });
    }

    const list = await RmaService.getReturnRequestsForUser(user.id);
    res.json({ success: true, returns: list, rmas: list }); // Support both field names
  } catch (err) {
    console.error('GET /api/rma error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single RMA
router.get('/:id', requiresAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const rma = await RmaService.getById(id);
    if (!rma) return res.status(404).json({ error: 'RMA not found' });
    res.json({ success: true, rma });
  } catch (err) {
    console.error('GET /api/rma/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: authorize or reject RMA
router.post('/:id/authorize', requiresAuth(), requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, message } = req.body; // action: 'authorize'|'reject'
    if (!['authorize','reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    const updated = await RmaService.authorizeReturn(id, action, req.oidc.user.email, message);
    res.json({ success: true, rma: updated });
  } catch (err) {
    console.error('POST /api/rma/:id/authorize error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: add inspection
router.post('/:id/inspect', requiresAuth(), requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { inspectorId, result, notes } = req.body;
    const inspection = await RmaService.addInspection(id, inspectorId || null, result, notes || null);
    res.json({ success: true, inspection });
  } catch (err) {
    console.error('POST /api/rma/:id/inspect error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: issue refund
router.post('/:id/refund', requiresAuth(), requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amountMinor, method, reason, paymentId } = req.body;
    if (!amountMinor || amountMinor <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const refund = await RmaService.issueRefund({ returnRequestId: id, amountMinor, method, reason, paymentId, actorId: req.oidc.user.email });
    res.json({ success: true, refund });
  } catch (err) {
    console.error('POST /api/rma/:id/refund error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: update return request status
router.patch('/:id/status', requiresAuth(), requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['INSPECTION', 'APPROVED_AWAITING_SHIPMENT', 'REJECTED', 'SHIPPED', 'COMPLETED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, rma: updated });
  } catch (err) {
    console.error('PATCH /api/rma/:id/status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
