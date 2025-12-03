import express from 'express';
import { prisma } from '../db.js';

const router = express.Router();

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  const adminEmails = ['izahs2003@gmail.com', 'tj2286@nyu.edu'];
  if (adminEmails.includes(req.oidc?.user?.email)) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Get all verification requests (student verification)
router.get('/verification-requests', requireAdmin, async (req, res) => {
  try {
    const requests = await prisma.verification_requests.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            picture: true
          }
        }
      }
    });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification requests'
    });
  }
});

// Approve/reject verification request
router.post('/verification-requests/:id/review', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const request = await prisma.verification_requests.findUnique({
      where: { id },
      include: { users: true }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found'
      });
    }

    // Update verification request
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: new Date(),
      reviewedBy: req.oidc.user.email
    };

    if (action === 'reject' && reason) {
      updateData.rejectionReason = reason;
    }

    const updatedRequest = await prisma.verification_requests.update({
      where: { id },
      data: updateData
    });

    // If approved, update user's verified status and student info
    if (action === 'approve') {
      await prisma.user.update({
        where: { id: request.userId },
        data: {
          isVerified: true,
          studentId: request.studentId,
          university: request.university,
          phoneNumber: request.phoneNumber || undefined
        }
      });
    }

    res.json({
      success: true,
      message: `Verification request ${action}d successfully`,
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error reviewing verification request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review verification request'
    });
  }
});

// Get all B2B businesses for verification
router.get('/businesses', requireAdmin, async (req, res) => {
  try {
    const businesses = await prisma.b2B.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            picture: true
          }
        }
      }
    });

    res.json({
      success: true,
      businesses
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch businesses'
    });
  }
});

// Verify/reject business
router.post('/businesses/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const updateData = {
      status: action === 'approve' ? 'VERIFIED' : 'REJECTED',
      rejectionReason: action === 'reject' ? (reason || 'No reason provided') : null
    };

    const business = await prisma.b2B.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            picture: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Business ${action}d successfully`,
      business
    });
  } catch (error) {
    console.error('Error updating business verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business verification'
    });
  }
});

// Get all purchases (admin view)
router.get('/purchases', requireAdmin, async (req, res) => {
  try {
    // Support filters: status, startDate, endDate, keyword (or q)
    const { status, startDate, endDate, keyword, q } = req.query;
    const searchTerm = (keyword || q || '').trim();

    const where = {};

    // Status filter: single or comma-separated
    if (status) {
      const statuses = String(status).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const sd = new Date(startDate);
        if (!isNaN(sd)) where.createdAt.gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate);
        if (!isNaN(ed)) where.createdAt.lte = ed;
      }
    }

    // Keyword search across sale id, product title, buyer email/name
    const orFilters = [];
    if (searchTerm && searchTerm.length > 0) {
      orFilters.push({ id: { contains: searchTerm } });
      orFilters.push({ items: { some: { product: { title: { contains: searchTerm, mode: 'insensitive' } } } } });
      orFilters.push({ buyer: { email: { contains: searchTerm, mode: 'insensitive' } } });
      orFilters.push({ buyer: { name: { contains: searchTerm, mode: 'insensitive' } } });
    }

    const purchases = await prisma.sale.findMany({
      where: Object.assign({}, where, orFilters.length > 0 ? { OR: orFilters } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
            picture: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                priceMinor: true,
                imageUrl: true
              }
            }
          }
        },
        payment: true
      }
    });

    res.json({
      success: true,
      purchases: purchases.map(purchase => ({
        id: purchase.id,
        user: purchase.buyer,
        totalAmount: purchase.totalMinor,
        status: purchase.status,
        createdAt: purchase.createdAt,
        items: purchase.items,
        payment: purchase.payment
      }))
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchases'
    });
  }
});

// Get dashboard statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalBusinesses,
      pendingBusinesses,
      totalProducts,
      totalSales,
      activeFlashSales,
      pendingVerifications
    ] = await Promise.all([
      prisma.user.count(),
      prisma.b2B.count(),
      prisma.b2B.count({ where: { status: 'PENDING' } }),
      prisma.product.count(),
      prisma.sale.count(),
      prisma.flashSale.count({
        where: {
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() }
        }
      }),
      prisma.verification_requests.count({ where: { status: 'pending' } })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBusinesses,
        pendingBusinesses,
        totalProducts,
        totalSales,
        activeFlashSales,
        pendingVerifications
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;

