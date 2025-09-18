import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, CreditCard, Banknote, Shield, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../api';

export default function Checkout({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');
  const quantity = parseInt(searchParams.get('quantity') || '1');
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      alert('Please login first to make a purchase');
      navigate('/');
      return;
    }

    if (!productId) {
      alert('Invalid product selected');
      navigate('/');
      return;
    }

    // Load product details
    const loadProduct = async () => {
      try {
        const response = await api.get('/products');
        const products = response.data.items;
        const foundProduct = products.find(p => p.id === productId);
        
        if (!foundProduct) {
          alert('Product not found');
          navigate('/');
          return;
        }

        if (foundProduct.sellerId === user.sub) {
          alert('You cannot purchase your own items');
          navigate('/');
          return;
        }

        if (foundProduct.stock < quantity) {
          alert('Insufficient stock available');
          navigate('/');
          return;
        }

        setProduct(foundProduct);
      } catch (error) {
        console.error('Error loading product:', error);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [user, productId, quantity, navigate]);

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      alert('Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/purchase', {
        productId: product.id,
        quantity: quantity,
        paymentMethod: selectedPaymentMethod
      });

      if (response.data.success) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        alert('Payment successful! Thank you for your purchase.');
        navigate('/');
      } else {
        alert(response.data.error || 'Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50" style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #ffffff, #ffffff, #faf5ff)'}}>
        <div className="container mx-auto px-6 py-12 max-w-4xl" style={{maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem'}}>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Loading checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50" style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #ffffff, #ffffff, #faf5ff)'}}>
        <div className="container mx-auto px-6 py-12 max-w-4xl" style={{maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem'}}>
          <div className="text-center py-12">
            <p className="text-red-600 text-lg">{error || 'Product not found'}</p>
            <Link to="/">
              <Button className="mt-4">Return to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const unitPrice = product.priceMinor / 100;
  const totalPrice = unitPrice * quantity;
  const isFreePurchase = product.priceMinor === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50" style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #ffffff, #ffffff, #faf5ff)'}}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50" style={{backgroundColor: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid #e9d5ff', position: 'sticky', top: 0, zIndex: 50}}>
        <div className="container mx-auto px-6 py-4 max-w-7xl" style={{maxWidth: '80rem', margin: '0 auto', padding: '1rem 1.5rem'}}>
          <div className="flex items-center space-x-3" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center" style={{width: '2rem', height: '2rem', background: 'linear-gradient(to bottom right, #c084fc, #9333ea)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent" style={{fontSize: '1.25rem', fontWeight: 'bold', background: 'linear-gradient(to right, #9333ea, #6b21a8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent'}}>
                Falcon Market
              </h1>
              <p className="text-xs text-gray-500" style={{fontSize: '0.75rem', color: '#6b7280'}}>Secure Checkout</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl" style={{maxWidth: '56rem', margin: '0 auto', padding: '3rem 1.5rem'}}>
        {/* Page Header */}
        <div className="text-center mb-12" style={{textAlign: 'center', marginBottom: '3rem'}}>
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{width: '4rem', height: '4rem', background: 'linear-gradient(to bottom right, #c084fc, #9333ea)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto'}}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-800 mb-4" style={{fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem'}}>Secure Checkout</h2>
          <p className="text-xl text-gray-600" style={{fontSize: '1.25rem', color: '#4b5563'}}>
            Review your order and complete your purchase
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{display: 'grid', gridTemplateColumns: '1fr', gap: '2rem'}}>
          {/* Product Details */}
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Info */}
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0" style={{width: '5rem', height: '5rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.title}
                      className="w-full h-full object-cover rounded-lg"
                      style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem'}}
                    />
                  ) : (
                    <ShoppingBag className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{product.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                  <div className="flex items-center gap-2">
                    {isFreePurchase ? (
                      <Badge className="bg-green-500 text-white">FREE</Badge>
                    ) : (
                      <span className="text-lg font-bold text-purple-600">
                        {unitPrice.toFixed(2)} {product.currency}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="border-t border-gray-200 pt-4" style={{borderTop: '1px solid #e5e7eb', paddingTop: '1rem'}}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span className="font-medium">{quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unit Price:</span>
                    <span className="font-medium">
                      {isFreePurchase ? 'FREE' : `${unitPrice.toFixed(2)} ${product.currency}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2" style={{borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem'}}>
                    <span>Total:</span>
                    <span className="text-purple-600">
                      {isFreePurchase ? 'FREE' : `${totalPrice.toFixed(2)} ${product.currency}`}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* Cash Payment */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPaymentMethod === 'CASH' 
                      ? 'border-purple-400 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                  onClick={() => setSelectedPaymentMethod('CASH')}
                  style={{
                    border: selectedPaymentMethod === 'CASH' ? '2px solid #c084fc' : '2px solid #e5e7eb',
                    backgroundColor: selectedPaymentMethod === 'CASH' ? '#faf5ff' : 'transparent',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div className="flex items-center gap-3" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center" style={{width: '3rem', height: '3rem', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <Banknote className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Cash on Collection</h4>
                      <p className="text-sm text-gray-600">Pay when you collect the item</p>
                    </div>
                    {selectedPaymentMethod === 'CASH' && (
                      <CheckCircle className="w-5 h-5 text-purple-600 ml-auto" />
                    )}
                  </div>
                </div>

                {/* Card Payment */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPaymentMethod === 'CARD' 
                      ? 'border-purple-400 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                  onClick={() => setSelectedPaymentMethod('CARD')}
                  style={{
                    border: selectedPaymentMethod === 'CARD' ? '2px solid #c084fc' : '2px solid #e5e7eb',
                    backgroundColor: selectedPaymentMethod === 'CARD' ? '#faf5ff' : 'transparent',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div className="flex items-center gap-3" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center" style={{width: '3rem', height: '3rem', backgroundColor: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Card Payment</h4>
                      <p className="text-sm text-gray-600">Secure online payment (Mock)</p>
                    </div>
                    {selectedPaymentMethod === 'CARD' && (
                      <CheckCircle className="w-5 h-5 text-purple-600 ml-auto" />
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <div className="pt-6" style={{paddingTop: '1.5rem'}}>
                <Button
                  onClick={handlePayment}
                  disabled={!selectedPaymentMethod || processing}
                  className="w-full h-12 text-lg bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white shadow-lg"
                  style={{
                    width: '100%',
                    height: '3rem',
                    fontSize: '1.125rem',
                    background: processing ? '#9ca3af' : 'linear-gradient(to right, #c084fc, #9333ea)',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {processing ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </>
                  ) : isFreePurchase ? (
                    'Confirm Collection'
                  ) : (
                    `Pay ${totalPrice.toFixed(2)} ${product.currency}`
                  )}
                </Button>
                
                <p className="text-center text-sm text-gray-500 mt-4">
                  <Shield className="w-4 h-4 inline mr-1" />
                  This is a mock payment system for demonstration purposes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
