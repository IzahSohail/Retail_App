import express from 'express';
import pkg from 'express-openid-connect';
const { requiresAuth } = pkg;
import { prisma } from '../db.js';

const router = express.Router();

// Submit seller verification request (student verification)
router.post('/request-seller', requiresAuth(), async (req, res) => {
  try {
    const auth0Id = req.oidc.user.sub;
    const { studentId, university, phoneNumber, additionalInfo } = req.body;

    // Validate inputs
    if (!studentId || !university) {
      return res.status(400).json({
        success: false,
        error: 'Student ID and university are required'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { auth0Id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user already has a pending or approved request
    const existingRequest = await prisma.verification_requests.findFirst({
      where: {
        userId: user.id,
        status: { in: ['pending', 'approved'] }
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'You already have a verification request in progress'
      });
    }

    // Create verification request
    const verificationRequest = await prisma.verification_requests.create({
      data: {
        userId: user.id,
        studentId,
        university,
        phoneNumber: phoneNumber || null,
        additionalInfo: additionalInfo || null,
        status: 'pending'
      }
    });

    res.json({
      success: true,
      verificationRequest
    });
  } catch (error) {
    console.error('Error creating verification request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit verification request'
    });
  }
});

// Get user's verification status
router.get('/status', requiresAuth(), async (req, res) => {
  try {
    const auth0Id = req.oidc.user.sub;

    const user = await prisma.user.findUnique({
      where: { auth0Id },
      include: {
        verification_requests: {
          orderBy: { submittedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      isVerified: user.isVerified,
      latestRequest: user.verification_requests[0] || null
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification status'
    });
  }
});

export default router;


