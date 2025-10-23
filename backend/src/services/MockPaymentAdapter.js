class MockPaymentAdapter {
  constructor(options = {}) {
    this.name = 'MockPaymentAdapter';
    this.failureRate = options.failureRate || 0; // 0 to 1 (0 = never fail, 1 = always fail)
    this.networkErrorRate = options.networkErrorRate || 0; // Simulate network issues
    this.processingDelay = options.processingDelay || 100; // ms
  }

  /**
   * Process a payment
   * @param {Object} paymentRequest - Payment details
   * @param {string} paymentRequest.amount - Amount in minor units (cents)
   * @param {string} paymentRequest.currency - Currency code
   * @param {string} paymentRequest.paymentMethod - Payment method (CARD, CASH, etc.)
   * @param {string} paymentRequest.idempotencyKey - Unique request identifier
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentRequest) {
    const { amount, currency, paymentMethod, idempotencyKey } = paymentRequest;

    console.log(`💳 [MockPaymentAdapter] Processing payment: ${amount} ${currency} via ${paymentMethod}`);
    console.log(`💳 [MockPaymentAdapter] Idempotency Key: ${idempotencyKey}`);

    // Simulate processing delay
    await this._delay(this.processingDelay);

    // Simulate network errors
    if (Math.random() < this.networkErrorRate) {
      console.error(`[MockPaymentAdapter] Network error simulated`);
      const error = new Error('Network timeout');
      error.code = 'NETWORK_ERROR';
      error.retryable = true;
      throw error;
    }

    // Simulate random failures
    if (Math.random() < this.failureRate) {
      console.error(`[MockPaymentAdapter] Payment declined (simulated failure)`);
      return {
        success: false,
        status: 'FAILED',
        transactionId: this._generateTransactionId(),
        message: 'Payment declined by issuer',
        timestamp: new Date().toISOString()
      };
    }

    // Simulate validation failures for specific scenarios
    if (amount <= 0) {
      console.error(`[MockPaymentAdapter] Invalid amount: ${amount}`);
      return {
        success: false,
        status: 'FAILED',
        message: 'Invalid payment amount',
        timestamp: new Date().toISOString()
      };
    }

    // Success case
    console.log(`[MockPaymentAdapter] Payment approved`);
    return {
      success: true,
      status: 'APPROVED',
      transactionId: this._generateTransactionId(),
      message: 'Payment processed successfully',
      timestamp: new Date().toISOString(),
      amount,
      currency,
      paymentMethod
    };
  }

  /**
   * Refund a payment (for rollback scenarios)
   * @param {string} transactionId - Original transaction ID
   * @param {number} amount - Amount to refund
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(transactionId, amount) {
    console.log(`[MockPaymentAdapter] Processing refund for transaction: ${transactionId}`);
    
    await this._delay(this.processingDelay);

    // Simulate occasional refund failures
    if (Math.random() < 0.05) { // 5% refund failure rate
      console.error(`[MockPaymentAdapter] Refund failed`);
      const error = new Error('Refund processing failed');
      error.code = 'REFUND_FAILED';
      error.retryable = true;
      throw error;
    }

    console.log(`[MockPaymentAdapter] Refund successful`);
    return {
      success: true,
      status: 'REFUNDED',
      refundId: this._generateTransactionId(),
      originalTransactionId: transactionId,
      amount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for circuit breaker
   * @returns {Promise<boolean>} True if service is healthy
   */
  async healthCheck() {
    try {
      await this._delay(50);
      // Simulate occasional health check failures
      if (Math.random() < 0.1) {
        throw new Error('Health check failed');
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a mock transaction ID
   * @private
   */
  _generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Simulate processing delay
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MockPaymentAdapter;

