import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Plus, Eye, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { api } from '../api';

export default function ReturnsRefunds({ user, onViewed }) {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadReturns();
    loadPurchases();
  }, [user, navigate]);

  // Mark returns as "seen" on this device once they've loaded
  useEffect(() => {
    if (!user || loading) return;
    try {
      const now = Date.now();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('returnsLastSeenAt', now.toString());
      }
      if (typeof onViewed === 'function') {
        onViewed(now);
      }
    } catch (err) {
      console.error('Failed to update returns last seen timestamp:', err);
    }
  }, [user, loading, onViewed]);

  const loadReturns = async () => {
    try {
      const response = await api.get('/rma');
      setReturns(response.data.returns || response.data.rmas || []);
    } catch (error) {
      console.error('Error loading returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async (opts = {}) => {
    try {
      // allow passing overrides or use current filters
      const params = {
        ...(opts.status ? { status: opts.status } : statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(opts.startDate || startDate ? { startDate: opts.startDate || startDate } : {}),
        ...(opts.endDate || endDate ? { endDate: opts.endDate || endDate } : {}),
         // Use `keyword` param to search by product name or order id (matches backend)
         ...(opts.keyword || query ? { keyword: opts.keyword || query } : {})
      };

      const response = await api.get('/purchases', { params });
      setPurchases(response.data.purchases || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const handleCreateReturn = async () => {
    if (!selectedPurchase || selectedItems.length === 0 || !reason.trim()) {
      alert('Please select a purchase, items, and provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/rma', {
        saleId: selectedPurchase.id,
        reason: reason.trim(),
        details: details.trim(),
        items: selectedItems.map(item => ({
          saleItemId: item.id,
          quantity: item.quantity,
          conditionNotes: ''
        }))
      });

      if (response.data.success) {
        alert(`Return request created successfully! RMA #${response.data.rma.rmaNumber}`);
        setShowCreateModal(false);
        setSelectedPurchase(null);
        setSelectedItems([]);
        setReason('');
        setDetails('');
        loadReturns();
      }
    } catch (error) {
      console.error('Error creating return:', error);
      alert('Failed to create return request: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, { ...item, quantity: item.quantity }];
      }
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      INSPECTION: { variant: 'secondary', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      APPROVED_AWAITING_SHIPMENT: { variant: 'default', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      IN_TRANSIT: { variant: 'secondary', icon: RefreshCw, color: 'bg-blue-100 text-blue-800' },
      RECEIVED: { variant: 'secondary', icon: Package, color: 'bg-purple-100 text-purple-800' },
      COMPLETED: { variant: 'default', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      REJECTED: { variant: 'destructive', icon: XCircle, color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || statusConfig.INSPECTION;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  Falcon Market
                </h1>
                <p className="text-xs text-gray-500">Returns & Refunds</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Loading your returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No return requests yet</h3>
            <p className="text-gray-600 mb-6">You haven't submitted any return requests.</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-400 to-purple-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Return
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <div className="text-center flex-1">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Return Requests</h2>
                <p className="text-gray-600">Track and manage your returns</p>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-400 to-purple-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Return
              </Button>
            </div>

            {returns.map((returnRequest) => (
              <Card key={returnRequest.id} className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      RMA #{returnRequest.rmaNumber}
                    </CardTitle>
                    {getStatusBadge(returnRequest.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Created on {new Date(returnRequest.createdAt).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Reason</p>
                      <p className="text-gray-800">{returnRequest.reason || 'No reason provided'}</p>
                    </div>
                    {returnRequest.details && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Details</p>
                        <p className="text-gray-800">{returnRequest.details}</p>
                      </div>
                    )}
                    {returnRequest.status === 'APPROVED_AWAITING_SHIPMENT' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900">Return Approved</p>
                            <p className="text-sm text-blue-700">Please ship the item back to us. You'll receive refund instructions once we receive and inspect the item.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {returnRequest.status === 'COMPLETED' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-900">Refund Completed</p>
                            <p className="text-sm text-green-700">Your refund has been processed successfully.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Return Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Return Request</CardTitle>
              <p className="text-sm text-gray-600 mt-2">Select a purchase and items you'd like to return</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Select Purchase */}
              <div>
                <Label className="text-base font-semibold mb-3 block">1. Select Purchase</Label>
                {/* Filters: status, date-range, keyword */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="RETURNED">Returned</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                    placeholder="Start date"
                  />

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                    placeholder="End date"
                  />

                  <div className="flex gap-2">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by product name or order ID"
                    />
                    <Button onClick={() => loadPurchases()} className="ml-2">Apply</Button>
                  </div>
                </div>

                {purchases.length === 0 ? (
                  <p className="text-gray-600 text-sm">No completed purchases available for return.</p>
                ) : (
                  <div className="space-y-2">
                    {purchases.map(purchase => (
                      <div
                        key={purchase.id}
                        onClick={() => {
                          setSelectedPurchase(purchase);
                          setSelectedItems([]);
                        }}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPurchase?.id === purchase.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Order #{purchase.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {purchase.items.length} item(s) • {(purchase.totalMinor / 100).toFixed(2)} AED
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Select Items */}
              {selectedPurchase && (
                <div>
                  <Label className="text-base font-semibold mb-3 block">2. Select Items to Return</Label>
                  <div className="space-y-2">
                    {selectedPurchase.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedItems.find(i => i.id === item.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!selectedItems.find(i => i.id === item.id)}
                            onChange={() => {}}
                            className="w-4 h-4"
                          />
                          {item.product.imageUrl && (
                            <img src={item.product.imageUrl} alt={item.product.title} className="w-12 h-12 object-cover rounded" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{item.product.title}</p>
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity} • {(item.unitMinor / 100).toFixed(2)} AED each
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Reason */}
              {selectedItems.length > 0 && (
                <>
                  <div>
                    <Label htmlFor="reason" className="text-base font-semibold mb-2 block">3. Reason for Return *</Label>
                    <select
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="">Select a reason...</option>
                      <option value="item is defected">Item is defective or damaged</option>
                      <option value="item is not what they were expecting">Item is not what I expected</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="details" className="text-base font-semibold mb-2 block">Additional Details (Optional)</Label>
                    <Textarea
                      id="details"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Provide any additional information about your return request..."
                      rows={4}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedPurchase(null);
                    setSelectedItems([]);
                    setReason('');
                    setDetails('');
                  }}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateReturn}
                  disabled={!selectedPurchase || selectedItems.length === 0 || !reason.trim() || submitting}
                  className="flex-1 bg-gradient-to-r from-purple-400 to-purple-600 text-white"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Return Request'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
