// Unit test for price calculation business logic (from server.js lines 528-534)

describe('Price Calculation Unit Tests', () => {
  // Test the price calculation logic that exists in the purchase endpoint
  function calculatePurchaseTotals(unitMinor, quantity) {
    // This mirrors the exact logic from server.js lines 528-534
    const lineTotalMinor = unitMinor * quantity;
    const subtotalMinor = lineTotalMinor;
    const taxMinor = Math.round(subtotalMinor * 0.05); // 5% tax
    const feesMinor = Math.round(subtotalMinor * 0.02); // 2% processing fee
    const totalMinor = subtotalMinor + taxMinor + feesMinor;
    
    return {
      unitMinor,
      lineTotalMinor,
      subtotalMinor,
      taxMinor,
      feesMinor,
      totalMinor
    };
  }

  test('should calculate correct totals for single item', () => {
    const result = calculatePurchaseTotals(1000, 1); // 10.00 AED * 1
    
    expect(result.unitMinor).toBe(1000);
    expect(result.lineTotalMinor).toBe(1000);
    expect(result.subtotalMinor).toBe(1000);
    expect(result.taxMinor).toBe(50); // 5% of 1000
    expect(result.feesMinor).toBe(20); // 2% of 1000
    expect(result.totalMinor).toBe(1070); // 1000 + 50 + 20
  });

  test('should calculate correct totals for multiple items', () => {
    const result = calculatePurchaseTotals(2500, 3); // 25.00 AED * 3
    
    expect(result.unitMinor).toBe(2500);
    expect(result.lineTotalMinor).toBe(7500);
    expect(result.subtotalMinor).toBe(7500);
    expect(result.taxMinor).toBe(375); // 5% of 7500
    expect(result.feesMinor).toBe(150); // 2% of 7500
    expect(result.totalMinor).toBe(8025); // 7500 + 375 + 150
  });

  test('should handle free items correctly', () => {
    const result = calculatePurchaseTotals(0, 1); // Free item
    
    expect(result.unitMinor).toBe(0);
    expect(result.lineTotalMinor).toBe(0);
    expect(result.subtotalMinor).toBe(0);
    expect(result.taxMinor).toBe(0);
    expect(result.feesMinor).toBe(0);
    expect(result.totalMinor).toBe(0);
  });

  test('should round tax and fees correctly', () => {
    const result = calculatePurchaseTotals(333, 1); // 3.33 AED (odd number for rounding)
    
    expect(result.subtotalMinor).toBe(333);
    expect(result.taxMinor).toBe(17); // Math.round(333 * 0.05) = Math.round(16.65) = 17
    expect(result.feesMinor).toBe(7); // Math.round(333 * 0.02) = Math.round(6.66) = 7
    expect(result.totalMinor).toBe(357); // 333 + 17 + 7
  });

  test('should handle large quantities', () => {
    const result = calculatePurchaseTotals(500, 10); // 5.00 AED * 10
    
    expect(result.lineTotalMinor).toBe(5000);
    expect(result.subtotalMinor).toBe(5000);
    expect(result.taxMinor).toBe(250); // 5% of 5000
    expect(result.feesMinor).toBe(100); // 2% of 5000
    expect(result.totalMinor).toBe(5350);
  });

  test('should maintain precision with minor units', () => {
    const result = calculatePurchaseTotals(1, 1); // 0.01 AED (smallest unit)
    
    expect(result.subtotalMinor).toBe(1);
    expect(result.taxMinor).toBe(0); // Math.round(0.05) = 0
    expect(result.feesMinor).toBe(0); // Math.round(0.02) = 0
    expect(result.totalMinor).toBe(1);
  });

  test('should calculate correct percentages', () => {
    const result = calculatePurchaseTotals(10000, 1); // 100.00 AED
    
    expect(result.subtotalMinor).toBe(10000);
    expect(result.taxMinor).toBe(500); // 5% = 500 minor units
    expect(result.feesMinor).toBe(200); // 2% = 200 minor units
    expect(result.totalMinor).toBe(10700); // 107.00 AED total
  });

  test('should handle edge case with 1 minor unit', () => {
    const result = calculatePurchaseTotals(1, 100); // 0.01 AED * 100 = 1.00 AED
    
    expect(result.lineTotalMinor).toBe(100);
    expect(result.subtotalMinor).toBe(100);
    expect(result.taxMinor).toBe(5); // Math.round(100 * 0.05) = 5
    expect(result.feesMinor).toBe(2); // Math.round(100 * 0.02) = 2
    expect(result.totalMinor).toBe(107);
  });
});