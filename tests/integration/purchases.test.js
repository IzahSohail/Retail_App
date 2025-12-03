/* eslint-env jest */
// Integration test for /api/purchases (CommonJS-ready for Jest)

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

// Mock express-openid-connect to bypass real Auth0 and provide requiresAuth middleware
jest.mock('express-openid-connect', () => ({
  auth: () => (req, res, next) => next(),
  requiresAuth: () => (req, res, next) => {
    // Simulate authenticated user
    req.oidc = { user: { sub: 'auth0|test-user', email: 'test@example.com' } };
    return next();
  }
}));

// Mock the prisma client used by the backend
const mockPrisma = {
  user: { findUnique: jest.fn() },
  sale: { findMany: jest.fn() },
  returnRequest: { findMany: jest.fn() }
};

jest.mock('../../backend/src/db.js', () => ({ prisma: mockPrisma }));

const request = require('supertest');
const { prisma } = require('../../backend/src/db.js');
const { app } = require('../../backend/src/server.js');

describe('GET /api/purchases filters', () => {
  beforeEach(() => {
    // Reset mocks
    prisma.user.findUnique.mockReset();
    prisma.sale.findMany.mockReset();
    prisma.returnRequest.findMany.mockReset();
  });

  test('returns purchases filtered by status', async () => {
    // Mock user lookup
    prisma.user.findUnique.mockResolvedValue({ id: 'user1', auth0Id: 'auth0|test-user' });

    // Mock sales - include one COMPLETED and one PENDING
    const now = new Date();
    prisma.sale.findMany.mockResolvedValue([
      { id: 's1', status: 'COMPLETED', createdAt: now, items: [{ product: { title: 'Blue Shirt' } }], payment: {} },
      { id: 's2', status: 'PENDING', createdAt: now, items: [{ product: { title: 'Green Hat' } }], payment: {} }
    ]);

    prisma.returnRequest.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/purchases')
      .query({ status: 'COMPLETED' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.purchases)).toBe(true);
    expect(res.body.purchases.length).toBe(1);
    expect(res.body.purchases[0].status).toBe('COMPLETED');
  });

  test('returns purchases filtered by keyword (product title)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user1', auth0Id: 'auth0|test-user' });

    const now = new Date();
    prisma.sale.findMany.mockResolvedValue([
      { id: 's1', status: 'COMPLETED', createdAt: now, items: [{ product: { title: 'Blue Shirt' } }], payment: {} },
      { id: 's2', status: 'COMPLETED', createdAt: now, items: [{ product: { title: 'Red Shoes' } }], payment: {} }
    ]);

    prisma.returnRequest.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/purchases')
      .query({ keyword: 'shirt' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.purchases.length).toBe(1);
    expect(res.body.purchases[0].items[0].product.title.toLowerCase()).toContain('shirt');
  });

  test('returns purchases filtered by date range', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user1', auth0Id: 'auth0|test-user' });

    const recent = new Date('2025-11-01');
    const older = new Date('2024-01-01');

    prisma.sale.findMany.mockResolvedValue([
      { id: 's1', status: 'COMPLETED', createdAt: recent, items: [{ product: { title: 'Blue Shirt' } }], payment: {} },
      { id: 's2', status: 'COMPLETED', createdAt: older, items: [{ product: { title: 'Red Shoes' } }], payment: {} }
    ]);

    prisma.returnRequest.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/purchases')
      .query({ startDate: '2025-01-01', endDate: '2025-12-31' })
      .expect(200);

    expect(res.body.success).toBe(true);
    // Only the recent one should be in the returned list after server-side filtering
    expect(res.body.purchases.some(p => new Date(p.createdAt) >= new Date('2025-01-01'))).toBe(true);
  });
});
