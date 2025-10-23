// Unit test for payment processing with PaymentService
import { PaymentService, MockPaymentAdapter } from '../../backend/src/services/PaymentService.js';

describe('Payment Service Unit Tests', () => {
  let paymentService;

  beforeEach(() => {
    // Create a fresh payment service for each test
    const mockAdapter = new MockPaymentAdapter({
      failureRate: 0,
      networkErrorRate: 0,
      processingDelay: 10
    });
    paymentService = new PaymentService(mockAdapter, {
      maxRetries: 2,
      retryDelay: 100
    });
  });

  test('should process payment successfully', async () => {
    const result = await paymentService.processPayment({
      amount: 1000,
      currency: 'AED',
      paymentMethod: 'CARD',
      idempotencyKey: 'test-key-1'
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('APPROVED');
    expect(result.transactionId).toBeDefined();
  });

  test('should handle idempotency correctly', async () => {
    const paymentRequest = {
      amount: 1000,
      currency: 'AED',
      paymentMethod: 'CARD',
      idempotencyKey: 'test-key-2'
    };

    const result1 = await paymentService.processPayment(paymentRequest);
    const result2 = await paymentService.processPayment(paymentRequest);

    expect(result1.transactionId).toBe(result2.transactionId);
    expect(result1).toEqual(result2);
  });

  test('should retry on network errors', async () => {
    const flakyAdapter = new MockPaymentAdapter({
      failureRate: 0,
      networkErrorRate: 0.8, // High error rate
      processingDelay: 10
    });
    const retryService = new PaymentService(flakyAdapter, {
      maxRetries: 5,
      retryDelay: 50
    });

    // Should eventually succeed after retries
    const result = await retryService.processPayment({
      amount: 1000,
      currency: 'AED',
      paymentMethod: 'CARD',
      idempotencyKey: 'test-retry-1'
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('APPROVED');
  });

  test('should handle payment declined', async () => {
    const failingAdapter = new MockPaymentAdapter({
      failureRate: 1, // Always fail
      networkErrorRate: 0,
      processingDelay: 10
    });
    const failService = new PaymentService(failingAdapter);

    const result = await failService.processPayment({
      amount: 1000,
      currency: 'AED',
      paymentMethod: 'CARD',
      idempotencyKey: 'test-fail-1'
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('FAILED');
  });

  test('should handle invalid amount', async () => {
    const result = await paymentService.processPayment({
      amount: -100,
      currency: 'AED',
      paymentMethod: 'CARD',
      idempotencyKey: 'test-invalid-1'
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid');
  });

  test('should process multiple different payments', async () => {
    const result1 = await paymentService.processPayment({
      amount: 1000,
      currency: 'AED',
      paymentMethod: 'CARD',
      idempotencyKey: 'test-multi-1'
    });

    const result2 = await paymentService.processPayment({
      amount: 2000,
      currency: 'AED',
      paymentMethod: 'CASH',
      idempotencyKey: 'test-multi-2'
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.transactionId).not.toBe(result2.transactionId);
  });
});

describe('Circuit Breaker Tests', () => {
  test('should open circuit after failure threshold', async () => {
    const failingAdapter = new MockPaymentAdapter({
      failureRate: 1,
      networkErrorRate: 0,
      processingDelay: 10
    });
    const cbService = new PaymentService(failingAdapter, {
      maxRetries: 0,
      failureThreshold: 3
    });

    // Make enough failures to open circuit
    for (let i = 0; i < 3; i++) {
      await cbService.processPayment({
        amount: 1000,
        currency: 'AED',
        paymentMethod: 'CARD',
        idempotencyKey: `test-cb-${i}`
      });
    }

    const status = cbService.getCircuitBreakerStatus();
    expect(status.state).toBe('OPEN');
    expect(status.failureCount).toBeGreaterThanOrEqual(3);
  });

  test('should reset circuit breaker', async () => {
    const failingAdapter = new MockPaymentAdapter({
      failureRate: 1,
      networkErrorRate: 0,
      processingDelay: 10
    });
    const cbService = new PaymentService(failingAdapter, {
      maxRetries: 0,
      failureThreshold: 2
    });

    // Open circuit
    await cbService.processPayment({
      amount: 1000,
      currency: 'AED',
      paymentMethod: 'CARD',
      idempotencyKey: 'test-reset-1'
    });
    await cbService.processPayment({
      amount: 1000,
      currency: 'AED',
      paymentMethod: 'CARD',
      idempotencyKey: 'test-reset-2'
    });

    cbService.resetCircuitBreaker();
    const status = cbService.getCircuitBreakerStatus();
    
    expect(status.state).toBe('CLOSED');
    expect(status.failureCount).toBe(0);
  });
});
