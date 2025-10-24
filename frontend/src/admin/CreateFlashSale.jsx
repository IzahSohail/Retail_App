import React, { useState } from 'react';

const CreateFlashSale = ({ products, onSaleCreated, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    startsAt: '',
    endsAt: '',
    productIds: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/flash-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          discountValue: parseFloat(formData.discountValue)
        })
      });

      const data = await response.json();

      if (data.success) {
        onSaleCreated?.(data.sale);
      } else {
        setError(data.error || 'Failed to create flash sale');
      }
    } catch (err) {
      setError(err.message || 'Failed to create flash sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Flash Sale Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Electronics Flash Sale"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your flash sale..."
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Discount Configuration */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Discount Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Discount Type</label>
              <select
                value={formData.discountType}
                onChange={(e) => handleInputChange('discountType', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (AED)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Discount Value {formData.discountType === 'PERCENTAGE' ? '(%)' : '(AED)'}
              </label>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) => handleInputChange('discountValue', e.target.value)}
                placeholder={formData.discountType === 'PERCENTAGE' ? '30' : '50'}
                min="1"
                max={formData.discountType === 'PERCENTAGE' ? '99' : '1000'}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Schedule</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => handleInputChange('startsAt', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.endsAt}
                onChange={(e) => handleInputChange('endsAt', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Product Selection */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Products ({formData.productIds.length} selected)</h3>
            <button
              type="button"
              onClick={() => setShowProductSelector(!showProductSelector)}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              {showProductSelector ? 'Hide Products' : 'Select Products'}
            </button>
          </div>
          
          {showProductSelector && (
            <div className="max-h-64 overflow-y-auto border rounded-md p-4">
              <div className="grid grid-cols-1 gap-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.productIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">{product.title}</span>
                      <span className="ml-2 text-sm text-gray-600">
                        AED {(product.priceMinor / 100).toFixed(2)}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Flash Sale'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateFlashSale;


