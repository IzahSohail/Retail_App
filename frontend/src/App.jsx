import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShoppingBag, User, LogOut, Plus, ShoppingCart, Package } from 'lucide-react';
import { api } from './api';
import { Button } from './components/ui/button';
import ProductsList from './components/ProductsList';
import UploadListing from './components/UploadListing';
import UserListings from './components/UserListings';
import ViewProfile from './components/ViewProfile';
import Checkout from './components/Checkout';
import Cart from './components/Cart';
import BusinessRegister from './business_panel/BusinessRegister';
import BusinessDashboard from './business_panel/BusinessDashboard';
import AdminPanel from './admin/AdminPanel';
import StudentVerification from './verification/StudentVerification';
import ReturnsRefunds from './components/ReturnRefunds';

export default function App() {
  const [greet, setGreet] = useState('');
  const [profile, setProfile] = useState(null);
  const [userHasListings, setUserHasListings] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  // Function to update cart count
  const updateCartCount = useCallback(async () => {
    if (!profile) {
      setCartItemCount(0);
      return;
    }
    
    try {
      const response = await api.get('/cart');
      const itemCount = response.data.items?.length || 0;
      setCartItemCount(itemCount);
    } catch (error) {
      console.error('Failed to load cart count:', error);
      setCartItemCount(0);
    }
  }, [profile]);

  // Separate useEffect for initial app load
  useEffect(() => {
    // Load greeting
    api.get('/greet')
      .then(r => setGreet(r.data.message))
      .catch(() => setGreet('Hi, Guest'));
    
    // Auto-load profile if user is logged in
    api.get('/profile')
      .then(r => {
        setProfile(r.data.user);
        // Check if user has listings
        return api.get('/my-listings');
      })
      .then(r => {
        setUserHasListings(r.data.listings.length > 0);
      })
      .catch(() => {
        // User not logged in, that's fine
        setUserHasListings(false);
        setCartItemCount(0);
      });
  }, []); //  Run only once on mount

  // Separate useEffect for cart count when profile changes..todo: what does this mean??
  useEffect(() => {
    updateCartCount();
  }, [updateCartCount]);

  const backendBase = (import.meta.env.VITE_BACKEND_BASE || 'http://localhost:3001');

  const handleLogin = () => { window.location.href = `${backendBase}/login`; };
  const handleLogout = () => { window.location.href = `${backendBase}/logout`; };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50" style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #ffffff, #ffffff, #faf5ff)'}}>
        <Routes>
          <Route path="/" element={
            <>
              {/* Header */}
              <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50" style={{backgroundColor: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid #e9d5ff', position: 'sticky', top: 0, zIndex: 50}}>
                <div className="container mx-auto px-6 py-4 max-w-7xl" style={{maxWidth: '80rem', margin: '0 auto', padding: '1rem 1.5rem'}}>
                  <div className="flex items-center justify-between" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    {/* Logo */}
                    <div className="flex items-center space-x-3" style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center" style={{width: '2rem', height: '2rem', background: 'linear-gradient(to bottom right, #c084fc, #9333ea)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <ShoppingBag className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent" style={{fontSize: '1.25rem', fontWeight: 'bold', background: 'linear-gradient(to right, #9333ea, #6b21a8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent'}}>
                          Falcon Market
                        </h1>
                        <p className="text-xs text-gray-500" style={{fontSize: '0.75rem', color: '#6b7280'}}>University Marketplace</p>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center space-x-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      {!profile ? (
                        <>
                          <Button onClick={handleLogin} variant="ghost" size="sm">
                            Login / Signup
                          </Button>
                          <Link to="/business">
                            <Button className="bg-gradient-to-r from-purple-400 to-purple-600 text-white" style={{background: 'linear-gradient(to right, #c084fc, #9333ea)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '500'}}>
                              Register Your Business
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-gray-600 mr-2" style={{fontSize: '0.875rem', color: '#4b5563', marginRight: '0.5rem'}}>
                            Hi, {profile.name || profile.email?.split('@')[0] || 'User'}
                          </span>
                          
                          {profile.role !== 'BUSINESS' && profile.role !== 'ADMIN' && (
                            <>
                              <Link to="/cart">
                                <Button variant="ghost" size="sm" className="relative">
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Cart
                                  {cartItemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{position: 'absolute', top: '-0.25rem', right: '-0.25rem', backgroundColor: '#ef4444', color: 'white', fontSize: '0.75rem', borderRadius: '50%', width: '1.25rem', height: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                      {cartItemCount}
                                    </span>
                                  )}
                                </Button>
                              </Link>
                              
                              <Link to="/returns">
                                <Button variant="ghost" size="sm">
                                  <Package className="w-4 h-4 mr-2" />
                                  Return an Item
                                </Button>
                              </Link>
                            </>
                          )}
                          
                          <Link to="/profile">
                            <Button variant="ghost" size="sm">
                              <User className="w-4 h-4 mr-2" />
                              Profile
                            </Button>
                          </Link>

                          {['izahs2003@gmail.com', 'tj2286@nyu.edu'].includes(profile.email) && (
                            <Link to="/admin">
                              <Button variant="outline" size="sm" className="border-purple-600 text-purple-600">
                                <User className="w-4 h-4 mr-2" />
                                Admin Panel
                              </Button>
                            </Link>
                          )}

                          {profile.role === 'ADMIN' ? (
                            // Admins don't see listing or seller buttons
                            null
                          ) : profile.role === 'BUSINESS' ? (
                            <Link to="/business/dashboard">
                              <Button variant="outline" size="sm">
                                <ShoppingBag className="w-4 h-4 mr-2" />
                                Business Dashboard
                              </Button>
                            </Link>
                          ) : (
                            <>
                              <Link to="/upload-listing">
                                <Button variant="outline" size="sm">
                                  <Plus className="w-4 h-4 mr-2" />
                                  List Item
                                </Button>
                              </Link>

                              {userHasListings && (
                                <Link to="/listings">
                                  <Button variant="ghost" size="sm">
                                    Your Listings
                                  </Button>
                                </Link>
                              )}
                              
                              {/* TODO: Re-enable when seller verification is properly implemented
                              <Link to="/verification">
                                <Button variant="ghost" size="sm" className="text-blue-600">
                                  Become a Seller
                                </Button>
                              </Link>
                              */}
                            </>
                          )}

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleLogout}
                            className="text-gray-600 hover:text-red-600"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <div className="container mx-auto px-6 py-12 max-w-7xl" style={{maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem'}}>
                {/* Hero Section */}
                <div className="text-center mb-16" style={{textAlign: 'center', marginBottom: '4rem'}}>
                  <h2 className="text-5xl font-bold text-gray-800 mb-6 text-balance" style={{fontSize: '3rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', lineHeight: '1.2'}}>
                    Buy & Sell with Fellow Students
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty mb-8" style={{fontSize: '1.25rem', color: '#4b5563', maxWidth: '48rem', margin: '0 auto 2rem auto', lineHeight: '1.6'}}>
                    Find textbooks, electronics, furniture, and more from students at your university. 
                    Sustainable shopping made easy.
                  </p>
                </div>

                {/* Products feed */}
                <ProductsList user={profile} onLogin={handleLogin} onCartUpdate={updateCartCount} />
              </div>
            </>
          } />
          
          <Route path="/upload-listing" element={
            <UploadListing user={profile} />
          } />
          
          <Route path="/listings" element={
            <UserListings user={profile} />
          } />
          
          <Route path="/profile" element={
            <ViewProfile user={profile} />
          } />
          
          <Route path="/cart" element={
            <Cart user={profile} />
          } />
          
          <Route path="/checkout" element={
            <Checkout user={profile} />
          } />

          <Route path="/business" element={<BusinessRegister />} />
          <Route path="/business/dashboard" element={<BusinessDashboard />} />
          
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/verification" element={<StudentVerification />} />
          <Route path="/returns" element={<ReturnsRefunds user={profile} />} />

        </Routes>
      </div>
    </Router>
  );
}