import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, ShoppingBag, Trash2, Plus, Minus, CreditCard, DollarSign } from 'lucide-react';

export default function Cart({ user }) {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CARD');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      alert('Please login first to view your cart');
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Load cart items
  useEffect(() => {
    const loadCart = async () => {
      try {
        const response = await api.get('/cart');
        setCartItems(response.data.items || []);
      } catch (error) {
        console.error('Failed to load cart:', error);
        alert('Failed to load cart');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadCart();
    }
  }, [user]);

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;

    setUpdating(prev => ({ ...prev, [productId]: true }));
    try {
      const response = await api.put('/cart/update', {
        productId,
        quantity: newQuantity
      });

      if (response.data.success) {
        setCartItems(prev => 
          prev.map(item => 
            item.product.id === productId 
              ? { ...item, quantity: newQuantity }
              : item
          )
        );
      } else {
        alert(response.data.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      alert(error.response?.data?.error || 'Failed to update quantity');
    } finally {
      setUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  const removeItem = async (productId) => {
    setUpdating(prev => ({ ...prev, [productId]: true }));
    try {
      const response = await api.delete('/cart/remove', {
        data: { productId }
      });

      if (response.data.success) {
        setCartItems(prev => prev.filter(item => item.product.id !== productId));
        alert('Item removed from cart');
      } else {
        alert(response.data.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Remove item error:', error);
      alert(error.response?.data?.error || 'Failed to remove item');
    } finally {
      setUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product.priceMinor * item.quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await api.post('/cart/checkout', {
        paymentMethod: selectedPaymentMethod
      });

      if (response.data.success) {
        alert('Purchase completed successfully!');
        setCartItems([]); // Clear cart
        navigate('/'); // Redirect to home
      } else {
        alert(response.data.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error.response?.data?.error || 'Checkout failed';
      alert(errorMessage);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  const totalMinor = calculateTotal();
  const totalPrice = totalMinor === 0 ? 'FREE' : `${(totalMinor / 100).toFixed(2)} AED`;

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
              <p className="text-xs text-gray-500" style={{fontSize: '0.75rem', color: '#6b7280'}}>Your Shopping Cart</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-7xl" style={{maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem'}}>
        {/* Hero Section */}
        <div className="text-center mb-12" style={{textAlign: 'center', marginBottom: '3rem'}}>
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{width: '4rem', height: '4rem', background: 'linear-gradient(to bottom right, #c084fc, #9333ea)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto'}}>
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-800 mb-4 text-balance" style={{fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem', lineHeight: '1.2'}}>
            Your Shopping Cart
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto text-pretty" style={{fontSize: '1.25rem', color: '#4b5563', maxWidth: '32rem', margin: '0 auto', lineHeight: '1.6'}}>
            Review your items and proceed to checkout when ready.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8" style={{textAlign: 'center', padding: '2rem 0'}}>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" style={{display: 'inline-block', width: '2rem', height: '2rem', border: '2px solid transparent', borderBottom: '2px solid #9333ea', borderRadius: '50%'}}></div>
            <p className="mt-2 text-gray-600" style={{marginTop: '0.5rem', color: '#4b5563'}}>Loading your cart...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12" style={{textAlign: 'center', padding: '3rem 0'}}>
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4" style={{color: '#6b7280', fontSize: '1.125rem', marginBottom: '1rem'}}>Your cart is empty</p>
            <Button asChild className="bg-gradient-to-r from-purple-500 to-purple-600 text-white" style={{background: 'linear-gradient(to right, #8b5cf6, #9333ea)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '500'}}>
              <Link to="/">
                Continue Shopping
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{display: 'grid', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: '2rem'}}>
            {/* Cart Items */}
            <div className="lg:col-span-2" style={{gridColumn: 'span 2 / span 2'}}>
              <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl" style={{backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid #e9d5ff'}}>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-800" style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937'}}>
                    Cart Items ({cartItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  {cartItems.map(item => {
                    const price = item.product.priceMinor === 0 ? 'FREE' : `${(item.product.priceMinor / 100).toFixed(2)} AED`;
                    const lineTotal = item.product.priceMinor * item.quantity;
                    const lineTotalPrice = lineTotal === 0 ? 'FREE' : `${(lineTotal / 100).toFixed(2)} AED`;
                    const isUpdating = updating[item.product.id];

                    return (
                      <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg" style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem'}}>
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0" style={{width: '5rem', height: '5rem', backgroundColor: '#e5e7eb', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                          {item.product.imageUrl ? (
                            <img 
                              src={item.product.imageUrl} 
                              alt={item.product.title}
                              className="w-full h-full object-cover rounded-lg"
                              style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem'}}
                            />
                          ) : (
                            <div className="text-gray-400 text-xs" style={{color: '#9ca3af', fontSize: '0.75rem'}}>No Image</div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1" style={{flex: 1}}>
                          <h3 className="font-semibold text-gray-800" style={{fontWeight: '600', color: '#1f2937'}}>{item.product.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2" style={{fontSize: '0.875rem', color: '#4b5563'}}>{item.product.description}</p>
                          <div className="flex items-center space-x-2 mt-1" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem'}}>
                            <span className="text-purple-600 font-semibold" style={{color: '#9333ea', fontWeight: '600'}}>{price}</span>
                            <Badge variant="outline" style={{border: '1px solid #d1d5db', color: '#6b7280'}}>Stock: {item.product.stock}</Badge>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            disabled={isUpdating || item.quantity <= 1}
                            style={{padding: '0.25rem 0.5rem', fontSize: '0.875rem', border: '1px solid #d1d5db'}}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold" style={{width: '2rem', textAlign: 'center', fontWeight: '600'}}>{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={isUpdating || item.quantity >= item.product.stock}
                            style={{padding: '0.25rem 0.5rem', fontSize: '0.875rem', border: '1px solid #d1d5db'}}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right" style={{textAlign: 'right'}}>
                          <p className="font-bold text-purple-600" style={{fontWeight: 'bold', color: '#9333ea'}}>{lineTotalPrice}</p>
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.product.id)}
                          disabled={isUpdating}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          style={{color: '#dc2626', border: '1px solid #d1d5db'}}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Checkout Summary */}
            <div className="lg:col-span-1">
              <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl sticky top-24" style={{backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid #e9d5ff', position: 'sticky', top: '6rem'}}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800" style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937'}}>
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  {/* Order Total */}
                  <div className="space-y-2" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    <div className="flex justify-between text-lg" style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem'}}>
                      <span>Total ({cartItems.length} items)</span>
                      <span className="font-bold text-purple-600" style={{fontWeight: 'bold', color: '#9333ea'}}>{totalPrice}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-3" style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                    <label className="text-sm font-semibold text-gray-800" style={{fontSize: '0.875rem', fontWeight: '600', color: '#1f2937'}}>Payment Method</label>
                    <div className="space-y-2" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                      <label className="flex items-center space-x-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <input
                          type="radio"
                          value="CARD"
                          checked={selectedPaymentMethod === 'CARD'}
                          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                          style={{margin: 0}}
                        />
                        <CreditCard className="w-4 h-4" />
                        <span>Card Payment</span>
                      </label>
                      <label className="flex items-center space-x-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <input
                          type="radio"
                          value="CASH"
                          checked={selectedPaymentMethod === 'CASH'}
                          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                          style={{margin: 0}}
                        />
                        <DollarSign className="w-4 h-4" />
                        <span>Cash upon Collection</span>
                      </label>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleCheckout}
                    disabled={isCheckingOut || cartItems.length === 0}
                    className="w-full h-12 text-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg"
                    style={{width: '100%', height: '3rem', fontSize: '1.125rem', background: 'linear-gradient(to right, #8b5cf6, #9333ea)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600'}}
                  >
                    {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center" style={{fontSize: '0.75rem', color: '#6b7280', textAlign: 'center'}}>
                    By proceeding, you agree to our terms of service
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
