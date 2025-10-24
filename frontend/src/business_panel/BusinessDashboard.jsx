import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Upload, BarChart3, CheckCircle, Clock, XCircle, ShoppingBag, LogOut } from 'lucide-react';
import VerifyBusiness from './VerifyBusiness';
import UploadCatalog from './UploadCatalog';

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('verify'); // verify, catalog, analytics
  const backendBase = process.env.REACT_APP_BACKEND_BASE || 'http://localhost:3001';

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      const res = await api.get('/business/profile');
      setBusinessInfo(res.data.user);
    } catch (err) {
      console.error('Error loading business info:', err);
      setError('Failed to load business dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-white to-purple-50">
        <p className="text-lg text-gray-700">Loading your business dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-white to-purple-50">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!businessInfo || businessInfo.role !== 'BUSINESS') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-white to-purple-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You are not registered as a business.</p>
          <Link to="/business">
            <Button className="mr-2">Register as Business</Button>
          </Link>
          
        </div>
      </div>
    );
  }

  const b2bStatus = businessInfo?.b2b?.status || 'PENDING';
  const isVerified = b2bStatus === 'VERIFIED';

  const getStatusBadge = () => {
    switch (b2bStatus) {
      case 'VERIFIED':
        return (
          <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="font-semibold">Verified</span>
          </div>
        );
      case 'UNDER_REVIEW':
        return (
          <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4 mr-2" />
            <span className="font-semibold">Under Review</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full">
            <XCircle className="w-4 h-4 mr-2" />
            <span className="font-semibold">Rejected</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4 mr-2" />
            <span className="font-semibold">Pending Verification</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-purple-700">Business Dashboard</h1>
              <p className="text-sm text-gray-600">{businessInfo.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge()}
        
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-8">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('verify')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'verify'
                      ? 'bg-purple-50 text-purple-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Verify Your Business</span>
                </button>

                <button
                  onClick={() => !isVerified ? alert('Please verify your business first') : setActiveTab('catalog')}
                  disabled={!isVerified}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'catalog'
                      ? 'bg-purple-50 text-purple-700 font-semibold'
                      : isVerified
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload Catalog</span>
                  {!isVerified && <span className="text-xs">🔒</span>}
                </button>

                <button
                  onClick={() => !isVerified ? alert('Please verify your business first') : setActiveTab('analytics')}
                  disabled={!isVerified}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-purple-50 text-purple-700 font-semibold'
                      : isVerified
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Analytics</span>
                  {!isVerified && <span className="text-xs">🔒</span>}
                </button>

                <div className="border-t border-gray-200 my-4"></div>

                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Browse Marketplace</span>
                </button>

                <button
                  onClick={() => window.location.href = `${backendBase}/logout`}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'verify' && (
              <VerifyBusiness businessInfo={businessInfo} onUpdate={fetchBusinessData} />
            )}
            {activeTab === 'catalog' && isVerified && (
              <UploadCatalog businessInfo={businessInfo} />
            )}
            {activeTab === 'analytics' && isVerified && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Analytics Coming Soon</h3>
                <p className="text-gray-600">We're working on bringing you detailed analytics about your products and sales.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
