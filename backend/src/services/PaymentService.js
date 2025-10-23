import MockPaymentAdapter from './MockPaymentAdapter.js';

// Circuit Breaker States
const CircuitState = {
  CLOSED: 'CLOSED',     
  OPEN: 'OPEN',         
  HALF_OPEN: 'HALF_OPEN' 
};

class PaymentService {
  constructor(adapter = null, options = {}) {
    // this is whatll change
    this.adapter = adapter || new MockPaymentAdapter({
      failureRate: 0,        
      networkErrorRate: 0.05, // 5% network errors for testing retry
      processingDelay: 100
    });

    // Retry configuration
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // ms
    this.retryBackoffMultiplier = options.retryBackoffMultiplier || 2;

    // Circuit breaker configuration
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.circuitTimeout || 60000, // 60s before trying again
    };

    // Payment history for idempotency
    this.paymentCache = new Map();
  }

  /**
   * Process a payment with retry and circuit breaker
   * @param {Object} paymentRequest - Payment details
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentRequest) {
    const { idempotencyKey } = paymentRequest;

    // Check idempotency cache
    if (this.paymentCache.has(idempotencyKey)) {
      console.log(`[PaymentService] Returning cached result for ${idempotencyKey}`);
      return this.paymentCache.get(idempotencyKey);
    }

    // Check circuit breaker
    if (!this._canAttemptPayment()) {
      console.error(`[PaymentService] Circuit breaker is OPEN, rejecting payment`);
      const error = new Error('Payment service temporarily unavailable');
      error.code = 'CIRCUIT_OPEN';
      error.retryable = false;
      throw error;
    }

    let lastError = null;
    let attempt = 0;

    // Retry loop
    while (attempt <= this.maxRetries) {
      try {
        attempt++;
        console.log(`[PaymentService] Payment attempt ${attempt}/${this.maxRetries + 1}`);

        // Call the payment adapter
        const result = await this.adapter.processPayment(paymentRequest);

        // Handle result
        if (result.success) {
          console.log(`[PaymentService] Payment successful on attempt ${attempt}`);
          this._recordSuccess();
          
          // Cache successful payment
          this.paymentCache.set(idempotencyKey, result);
          
          return result;
        } else {
          // Payment failed (declined, validation error, etc.)
          console.error(`[PaymentService] Payment failed: ${result.message}`);
          this._recordFailure();
          
          // Cache failed payment to prevent retries
          this.paymentCache.set(idempotencyKey, result);
          
          return result;
        }
      } catch (error) {
        lastError = error;
        console.error(`[PaymentService] Attempt ${attempt} failed:`, error.message);

        // Check if error is retryable
        if (!error.retryable && error.code !== 'NETWORK_ERROR') {
          console.error(`[PaymentService] Non-retryable error, aborting`);
          this._recordFailure();
          throw error;
        }

        // Record failure for circuit breaker
        this._recordFailure();

        // If not last attempt, wait before retry
        if (attempt <= this.maxRetries) {
          const delay = this._calculateBackoff(attempt);
          console.log(`⏳ [PaymentService] Retrying in ${delay}ms...`);
          await this._delay(delay);
        }
      }
    }

    // All retries exhausted
    console.error(`[PaymentService] All ${this.maxRetries + 1} attempts failed`);
    throw lastError || new Error('Payment processing failed after all retries');
  }

  /**
   * Refund a payment with retry logic
   * @param {string} transactionId - Transaction to refund
   * @param {number} amount - Amount to refund
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(transactionId, amount) {
    console.log(`[PaymentService] Initiating refund for ${transactionId}`);

    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      try {
        attempt++;
        console.log(`[PaymentService] Refund attempt ${attempt}/${this.maxRetries + 1}`);

        const result = await this.adapter.refundPayment(transactionId, amount);

        if (result.success) {
          console.log(`[PaymentService] Refund successful on attempt ${attempt}`);
          return result;
        } else {
          throw new Error('Refund failed: ' + result.message);
        }
      } catch (error) {
        lastError = error;
        console.error(`[PaymentService] Refund attempt ${attempt} failed:`, error.message);

        if (attempt <= this.maxRetries) {
          const delay = this._calculateBackoff(attempt);
          console.log(`⏳ [PaymentService] Retrying refund in ${delay}ms...`);
          await this._delay(delay);
        }
      }
    }

    console.error(`[PaymentService] All refund attempts failed`);
    throw lastError || new Error('Refund failed after all retries');
  }

  /**
   * Check if payment can be attempted (circuit breaker logic)
   * @private
   */
  _canAttemptPayment() {
    const { state, lastFailureTime, timeout } = this.circuitBreaker;

    switch (state) {
      case CircuitState.CLOSED:
        // Normal operation
        return true;

      case CircuitState.OPEN:
        // Check if timeout has passed
        const timeSinceFailure = Date.now() - lastFailureTime;
        if (timeSinceFailure >= timeout) {
          console.log(`[CircuitBreaker] Timeout elapsed, moving to HALF_OPEN`);
          this.circuitBreaker.state = CircuitState.HALF_OPEN;
          this.circuitBreaker.successCount = 0;
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow limited requests to test recovery
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful payment for circuit breaker
   * @private
   */
  _recordSuccess() {
    const { state, successThreshold } = this.circuitBreaker;

    if (state === CircuitState.HALF_OPEN) {
      this.circuitBreaker.successCount++;
      console.log(`[CircuitBreaker] Success count: ${this.circuitBreaker.successCount}/${successThreshold}`);

      if (this.circuitBreaker.successCount >= successThreshold) {
        console.log(`[CircuitBreaker] Service recovered, moving to CLOSED`);
        this.circuitBreaker.state = CircuitState.CLOSED;
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.successCount = 0;
      }
    } else if (state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.circuitBreaker.failureCount = 0;
    }
  }

  /**
   * Record failed payment for circuit breaker
   * @private
   */
  _recordFailure() {
    const { state, failureThreshold } = this.circuitBreaker;

    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    console.log(`[CircuitBreaker] Failure count: ${this.circuitBreaker.failureCount}/${failureThreshold}`);

    if (state === CircuitState.CLOSED && this.circuitBreaker.failureCount >= failureThreshold) {
      console.error(`[CircuitBreaker] Failure threshold reached, moving to OPEN`);
      this.circuitBreaker.state = CircuitState.OPEN;
    } else if (state === CircuitState.HALF_OPEN) {
      console.error(`[CircuitBreaker] Failed during HALF_OPEN, moving back to OPEN`);
      this.circuitBreaker.state = CircuitState.OPEN;
      this.circuitBreaker.successCount = 0;
    }
  }

  /**
   * Calculate exponential backoff delay
   * @private
   */
  _calculateBackoff(attempt) {
    return this.retryDelay * Math.pow(this.retryBackoffMultiplier, attempt - 1);
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status (for monitoring)
   */
  getCircuitBreakerStatus() {
    return {
      state: this.circuitBreaker.state,
      failureCount: this.circuitBreaker.failureCount,
      successCount: this.circuitBreaker.successCount,
      lastFailureTime: this.circuitBreaker.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker (for testing/admin purposes)
   */
  resetCircuitBreaker() {
    console.log(`[CircuitBreaker] Manual reset`);
    this.circuitBreaker.state = CircuitState.CLOSED;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.successCount = 0;
    this.circuitBreaker.lastFailureTime = null;
  }

  /**
   * Clear payment cache
   */
  clearCache() {
    console.log(`[PaymentService] Clearing payment cache`);
    this.paymentCache.clear();
  }
}

// Create singleton instance
const paymentService = new PaymentService();

export default paymentService;
export { PaymentService, MockPaymentAdapter };

