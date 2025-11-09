import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  
  const [students, setStudents] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [showCreateFlashSale, setShowCreateFlashSale] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState(null);
  const [flashSaleForm, setFlashSaleForm] = useState({
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    startsAt: '',
    endsAt: '',
    productIds: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get profile
      const profileRes = await fetch('/api/profile', { credentials: 'include' });
      const profileData = await profileRes.json();
      setUser(profileData.user);

      // Check admin, we r setting only 2 of us as admin (team mates)
      const adminEmails = ['izahs2003@gmail.com', 'tj2286@nyu.edu'];
      if (!adminEmails.includes(profileData.user?.email)) {
        return;
      }

      // Load students
      const studentsRes = await fetch('/api/admin/verification-requests', { credentials: 'include' });
      const studentsData = await studentsRes.json();
      setStudents(studentsData.requests || []);

      // Load businesses
      const businessRes = await fetch('/api/admin/businesses', { credentials: 'include' });
      const businessData = await businessRes.json();
      setBusinesses(businessData.businesses || []);

      // Load sales
      const salesRes = await fetch('/api/admin/purchases', { credentials: 'include' });
      const salesData = await salesRes.json();
      setSales(salesData.purchases || []);

      // Load products
      const productsRes = await fetch('/api/products?limit=1000', { credentials: 'include' });
      const productsData = await productsRes.json();
      setProducts(productsData.items || []);

      // Load flash sales
      const flashSalesRes = await fetch('/api/admin/flash-sales', { credentials: 'include' });
      const flashSalesData = await flashSalesRes.json();
      setFlashSales(flashSalesData.sales || []);

      // Load returns
      const returnsRes = await fetch('/api/rma', { credentials: 'include' });
      const returnsData = await returnsRes.json();
      setReturns(returnsData.rmas || returnsData.returns || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentAction = async (id, action) => {
    const reason = action === 'reject' ? prompt('Rejection reason:') : '';
    if (action === 'reject' && !reason) return;

    try {
      await fetch(`/api/admin/verification-requests/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason })
      });
      alert('Updated successfully');
      loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleBusinessAction = async (id, action) => {
    const reason = action === 'reject' ? prompt('Rejection reason:') : '';
    
    try {
      await fetch(`/api/admin/businesses/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason: reason || '' })
      });
      alert('Updated successfully');
      loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;

    try {
      await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      alert('Deleted successfully');
      loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteFlashSale = async (id) => {
    if (!confirm('Delete this flash sale?')) return;

    try {
      await fetch(`/api/admin/flash-sales/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      alert('Flash sale deleted successfully');
      loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleCreateFlashSale = async (e) => {
    e.preventDefault();

    // Validation
    if (!flashSaleForm.title || !flashSaleForm.discountValue || !flashSaleForm.startsAt || !flashSaleForm.endsAt) {
      alert('Please fill in all required fields');
      return;
    }

    if (flashSaleForm.productIds.length === 0) {
      alert('Please select at least one product');
      return;
    }

    try {
      const response = await fetch('/api/admin/flash-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: flashSaleForm.title,
          description: flashSaleForm.description,
          discountType: flashSaleForm.discountType,
          discountValue: parseInt(flashSaleForm.discountValue),
          startsAt: new Date(flashSaleForm.startsAt).toISOString(),
          endsAt: new Date(flashSaleForm.endsAt).toISOString(),
          productIds: flashSaleForm.productIds
        })
      });

      if (response.ok) {
        alert('Flash sale created successfully!');
        setShowCreateFlashSale(false);
        setFlashSaleForm({
          title: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: '',
          startsAt: '',
          endsAt: '',
          productIds: []
        });
        loadData();
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to create flash sale'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const toggleProductSelection = (productId) => {
    setFlashSaleForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const handleActivateFlashSale = (sale) => {
    // Load current products in this flash sale
    const currentProductIds = sale.items?.map(item => item.productId) || [];
    setFlashSaleForm({
      title: sale.title,
      description: sale.description,
      discountType: sale.discountType,
      discountValue: sale.discountValue,
      startsAt: new Date(sale.startsAt).toISOString().slice(0, 16),
      endsAt: new Date(sale.endsAt).toISOString().slice(0, 16),
      productIds: currentProductIds
    });
    setEditingFlashSale(sale);
  };

  const handleUpdateFlashSaleProducts = async (e) => {
    e.preventDefault();

    if (!editingFlashSale) return;

    if (flashSaleForm.productIds.length === 0) {
      alert('Please select at least one product');
      return;
    }

    try {
      const response = await fetch(`/api/admin/flash-sales/${editingFlashSale.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productIds: flashSaleForm.productIds
        })
      });

      if (response.ok) {
        alert('Products updated successfully!');
        setEditingFlashSale(null);
        setFlashSaleForm({
          title: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: '',
          startsAt: '',
          endsAt: '',
          productIds: []
        });
        loadData();
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to update products'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleReturnAction = async (returnId, action) => {
    const message = action === 'reject' ? prompt('Rejection reason:') : '';
    if (action === 'reject' && !message) return;

    try {
      await fetch(`/api/rma/${returnId}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, message })
      });
      alert(`Return ${action === 'authorize' ? 'approved' : 'rejected'} successfully!`);
      loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleIssueRefund = async (returnId) => {
    const amountStr = prompt('Enter refund amount (in minor units, e.g., 1000 for 10.00 AED):');
    if (!amountStr) return;
    
    const amountMinor = parseInt(amountStr);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      alert('Invalid amount');
      return;
    }

    const method = confirm('Click OK for Original Payment refund, Cancel for Store Credit') ? 'ORIGINAL_PAYMENT' : 'STORE_CREDIT';

    try {
      await fetch(`/api/rma/${returnId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amountMinor, method, reason: 'Admin issued refund' })
      });
      alert('Refund issued successfully!');
      loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-8">Loading...</div>;
  }

  const adminEmails = ['izahs2003@gmail.com', 'tj2286@nyu.edu'];
  if (!user || !adminEmails.includes(user.email)) {
    return <div className="container mx-auto p-8">Access Denied</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-2 px-4 ${activeTab === 'students' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
        >
          Student Verification ({students.filter(s => s.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('businesses')}
          className={`pb-2 px-4 ${activeTab === 'businesses' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
        >
          Business Verification ({businesses.filter(b => b.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-2 px-4 ${activeTab === 'sales' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
        >
          Sales Log ({sales.length})
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`pb-2 px-4 ${activeTab === 'returns' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
        >
          Returns/Refunds ({returns.filter(r => r.status === 'INSPECTION').length})
        </button>
        <button
          onClick={() => setActiveTab('flashsales')}
          className={`pb-2 px-4 ${activeTab === 'flashsales' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
        >
          Flash Sales ({flashSales.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-2 px-4 ${activeTab === 'products' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
        >
          Products ({products.length})
        </button>
      </div>

      {/* Student Verification Tab */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Student Verifications</h2>
            <Button onClick={loadData} variant="outline">Refresh</Button>
          </div>

          {students.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No requests
              </CardContent>
            </Card>
          ) : (
            students.map(student => (
              <Card key={student.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{student.users?.name || 'Unknown'}</CardTitle>
                      <p className="text-sm text-gray-600">{student.users?.email}</p>
                    </div>
                    <Badge variant={student.status === 'pending' ? 'default' : student.status === 'approved' ? 'success' : 'destructive'}>
                      {student.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Student ID</p>
                      <p className="font-medium">{student.studentId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">University</p>
                      <p className="font-medium">{student.university}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{student.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Submitted</p>
                      <p className="font-medium">{new Date(student.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {student.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button onClick={() => handleStudentAction(student.id, 'approve')} size="sm">
                        Approve
                      </Button>
                      <Button onClick={() => handleStudentAction(student.id, 'reject')} variant="destructive" size="sm">
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Business Verification Tab */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Business Verifications</h2>
            <Button onClick={loadData} variant="outline">Refresh</Button>
          </div>

          {businesses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No applications
              </CardContent>
            </Card>
          ) : (
            businesses.map(business => (
              <Card key={business.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{business.businessName || 'Unnamed Business'}</CardTitle>
                      <p className="text-sm text-gray-600">{business.user?.email}</p>
                    </div>
                    <Badge variant={business.status === 'PENDING' ? 'default' : business.status === 'VERIFIED' ? 'success' : 'destructive'}>
                      {business.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Owner</p>
                        <p className="font-medium">{business.user?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Applied</p>
                        <p className="font-medium">{new Date(business.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Description</p>
                        <p className="font-medium">{business.businessDescription || 'No description'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium">{business.registeredAddress || 'No address'}</p>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm font-medium mb-2">Trade License</p>
                        {business.tradeLicenseUrl ? (
                          <div>
                            <iframe src={business.tradeLicenseUrl} className="w-full h-48 border rounded mb-2" title="Trade License" />
                            <a href={business.tradeLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                              Open Full Size →
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Not uploaded</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Establishment Card</p>
                        {business.establishmentCardUrl ? (
                          <div>
                            <iframe src={business.establishmentCardUrl} className="w-full h-48 border rounded mb-2" title="Establishment Card" />
                            <a href={business.establishmentCardUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                              Open Full Size →
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Not uploaded</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-4 border-t">
                      <Button onClick={() => handleBusinessAction(business.id, 'approve')} size="sm">
                        Approve
                      </Button>
                      <Button onClick={() => handleBusinessAction(business.id, 'reject')} variant="destructive" size="sm">
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Sales Log Tab */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Sales Activity Log</h2>
            <Button onClick={loadData} variant="outline">Refresh</Button>
          </div>

          {/* Sales Metrics */}
          {sales.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    د.إ {(sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{sales.length} orders</p>
                </CardContent>
              </Card>
            </div>
          )}

          {sales.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No sales yet
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Buyer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sales.map((sale, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{new Date(sale.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <div>{sale.user?.name}</div>
                          <div className="text-gray-500 text-xs">{sale.user?.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{sale.product?.title}</td>
                        <td className="px-4 py-3 text-sm">{sale.quantity}</td>
                        <td className="px-4 py-3 text-sm">د.إ {(sale.totalAmount / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={sale.status === 'completed' ? 'success' : 'default'}>
                            {sale.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Returns/Refunds Tab */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Returns & Refunds Management</h2>
            <Button onClick={loadData} variant="outline">Refresh</Button>
          </div>

          {/* Returns Metrics */}
          {returns.length > 0 && (() => {
            const completedReturns = returns.filter(r => r.status === 'COMPLETED' && r.createdAt && r.completedAt);
            const cycleTimes = completedReturns.map(r => {
              const created = new Date(r.createdAt);
              const completed = new Date(r.completedAt);
              return (completed - created) / (1000 * 60 * 60 * 24); // Convert to days
            });
            const avgCycleTime = cycleTimes.length > 0 
              ? (cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length).toFixed(1)
              : '0.0';
            
            const totalRefundAmount = returns.reduce((sum, r) => {
              if (r.refunds && r.refunds.length > 0) {
                return sum + r.refunds.reduce((rSum, refund) => rSum + (refund.amountMinor || 0), 0);
              }
              return sum;
            }, 0);

            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Returns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{returns.length}</div>
                    <p className="text-xs text-gray-500 mt-1">
                      {returns.filter(r => r.status === 'INSPECTION').length} pending review
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Refunds Issued</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {returns.filter(r => r.refunds && r.refunds.length > 0).length}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      د.إ {(totalRefundAmount / 100).toFixed(2)} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Avg Cycle Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{avgCycleTime} days</div>
                    <p className="text-xs text-gray-500 mt-1">
                      {completedReturns.length} completed returns
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Refund Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {sales.length > 0 
                        ? ((returns.filter(r => r.refunds && r.refunds.length > 0).length / sales.length) * 100).toFixed(1)
                        : '0.0'}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">of total orders</p>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {returns.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No return requests
              </CardContent>
            </Card>
          ) : (
            returns.map(returnReq => (
              <Card key={returnReq.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>RMA: {returnReq.rmaNumber}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Requested: {new Date(returnReq.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        returnReq.status === 'INSPECTION' ? 'warning' :
                        returnReq.status === 'APPROVED_AWAITING_SHIPMENT' ? 'default' :
                        returnReq.status === 'REJECTED' ? 'destructive' :
                        returnReq.status === 'SHIPPED' ? 'default' :
                        returnReq.status === 'COMPLETED' ? 'success' :
                        'default'
                      }
                    >
                      {returnReq.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">User</p>
                        <p className="text-sm">{returnReq.user?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{returnReq.user?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Sale ID</p>
                        <p className="text-sm font-mono">{returnReq.saleId}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600">Reason</p>
                      <p className="text-sm">{returnReq.reason || 'N/A'}</p>
                    </div>

                    {returnReq.details && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Details</p>
                        <p className="text-sm">{returnReq.details}</p>
                      </div>
                    )}

                    {returnReq.items && returnReq.items.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Items</p>
                        <div className="space-y-2">
                          {returnReq.items.map((item, idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                              <p>Quantity: {item.quantity}</p>
                              {item.conditionNotes && (
                                <p className="text-gray-600">Notes: {item.conditionNotes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {returnReq.photoUrls && returnReq.photoUrls.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Photos</p>
                        <div className="flex gap-2 flex-wrap">
                          {returnReq.photoUrls.map((url, idx) => (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm underline"
                            >
                              Photo {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {returnReq.refunds && returnReq.refunds.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Refunds</p>
                        <div className="space-y-2">
                          {returnReq.refunds.map((refund, idx) => (
                            <div key={idx} className="bg-green-50 p-2 rounded text-sm">
                              <p>Amount: {refund.amountMinor / 100} {refund.currency}</p>
                              <p>Method: {refund.method}</p>
                              <p>Status: {refund.status}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      {returnReq.status === 'INSPECTION' && (
                        <>
                          <Button
                            onClick={() => handleReturnAction(returnReq.id, 'authorize')}
                            size="sm"
                            variant="default"
                          >
                            Approve Return
                          </Button>
                          <Button
                            onClick={() => handleReturnAction(returnReq.id, 'reject')}
                            size="sm"
                            variant="destructive"
                          >
                            Reject Return
                          </Button>
                        </>
                      )}
                      
                      {(returnReq.status === 'SHIPPED' || returnReq.status === 'APPROVED_AWAITING_SHIPMENT') && (
                        <Button
                          onClick={() => handleIssueRefund(returnReq.id)}
                          size="sm"
                          variant="default"
                        >
                          Issue Refund
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Flash Sales Tab */}
      {activeTab === 'flashsales' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Flash Sales</h2>
            <div className="flex space-x-2">
              <Button onClick={loadData} variant="outline">Refresh</Button>
              <Button onClick={() => setShowCreateFlashSale(!showCreateFlashSale)}>
                {showCreateFlashSale ? 'Cancel' : '+ Create Flash Sale'}
              </Button>
            </div>
          </div>

          {/* Create Flash Sale Form */}
          {showCreateFlashSale && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Flash Sale</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateFlashSale} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title *</label>
                      <input
                        type="text"
                        value={flashSaleForm.title}
                        onChange={(e) => setFlashSaleForm({...flashSaleForm, title: e.target.value})}
                        className="w-full border rounded px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <input
                        type="text"
                        value={flashSaleForm.description}
                        onChange={(e) => setFlashSaleForm({...flashSaleForm, description: e.target.value})}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Discount Type *</label>
                      <select
                        value={flashSaleForm.discountType}
                        onChange={(e) => setFlashSaleForm({...flashSaleForm, discountType: e.target.value})}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED">Fixed Amount (AED)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Discount Value * {flashSaleForm.discountType === 'PERCENTAGE' ? '(%)' : '(AED)'}
                      </label>
                      <input
                        type="number"
                        value={flashSaleForm.discountValue}
                        onChange={(e) => setFlashSaleForm({...flashSaleForm, discountValue: e.target.value})}
                        className="w-full border rounded px-3 py-2"
                        min="1"
                        max={flashSaleForm.discountType === 'PERCENTAGE' ? '99' : undefined}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={flashSaleForm.startsAt}
                        onChange={(e) => setFlashSaleForm({...flashSaleForm, startsAt: e.target.value})}
                        className="w-full border rounded px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">End Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={flashSaleForm.endsAt}
                        onChange={(e) => setFlashSaleForm({...flashSaleForm, endsAt: e.target.value})}
                        className="w-full border rounded px-3 py-2"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Select Products * ({flashSaleForm.productIds.length} selected)</label>
                    <div className="border rounded p-4 max-h-60 overflow-y-auto space-y-2">
                      {products.map(product => (
                        <label key={product.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={flashSaleForm.productIds.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="rounded"
                          />
                          <span className="flex-1">{product.title} - د.إ {(product.priceMinor / 100).toFixed(2)}</span>
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.title} className="w-10 h-10 object-cover rounded" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit">Create Flash Sale</Button>
                    <Button type="button" variant="outline" onClick={() => setShowCreateFlashSale(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {flashSales.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No flash sales created
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {flashSales.map(sale => (
                <Card key={sale.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{sale.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{sale.description}</p>
                      </div>
                      <Button onClick={() => handleDeleteFlashSale(sale.id)} variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Discount</p>
                        <p className="font-semibold">
                          {sale.discountType === 'PERCENTAGE' 
                            ? `${sale.discountValue}%` 
                            : `د.إ ${(sale.discountValue / 100).toFixed(2)}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Starts</p>
                        <p className="font-semibold">{new Date(sale.startsAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Ends</p>
                        <p className="font-semibold">{new Date(sale.endsAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Products</p>
                        <p className="font-semibold">{sale.items?.length || 0} items</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <Badge variant={
                          new Date(sale.endsAt) < new Date() ? 'secondary' :
                          new Date(sale.startsAt) > new Date() ? 'default' :
                          'success'
                        }>
                          {new Date(sale.endsAt) < new Date() ? 'Ended' :
                           new Date(sale.startsAt) > new Date() ? 'Upcoming' :
                           'Active'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Activate/Manage Products Button */}
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        onClick={() => handleActivateFlashSale(sale)} 
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        {sale.items?.length > 0 ? 'Manage Products' : 'Activate Sale - Select Products'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Flash Sale Products Modal */}
          {editingFlashSale && (
            <Card className="mt-4 border-2 border-blue-500">
              <CardHeader className="bg-blue-50">
                <CardTitle>Manage Products for: {editingFlashSale.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleUpdateFlashSaleProducts} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">
                        Select Products ({flashSaleForm.productIds.length} selected)
                      </label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setFlashSaleForm({...flashSaleForm, productIds: products.map(p => p.id)})}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setFlashSaleForm({...flashSaleForm, productIds: []})}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded p-4 max-h-60 overflow-y-auto space-y-2 bg-gray-50">
                      {products.map(product => (
                        <label key={product.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded">
                          <input
                            type="checkbox"
                            checked={flashSaleForm.productIds.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="rounded"
                          />
                          <span className="flex-1">{product.title} - د.إ {(product.priceMinor / 100).toFixed(2)}</span>
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.title} className="w-10 h-10 object-cover rounded" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit">💾 Save Changes</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setEditingFlashSale(null);
                        setFlashSaleForm({
                          title: '',
                          description: '',
                          discountType: 'PERCENTAGE',
                          discountValue: '',
                          startsAt: '',
                          endsAt: '',
                          productIds: []
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">All Products</h2>
            <Button onClick={loadData} variant="outline">Refresh</Button>
          </div>

          {products.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No products
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    {product.imageUrl && (
                      <img src={product.imageUrl} alt={product.title} className="w-full h-40 object-cover rounded mb-3" />
                    )}
                    <h3 className="font-semibold mb-1">{product.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold">د.إ {(product.priceMinor / 100).toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Stock: {product.stock}</p>
                      </div>
                      <Button onClick={() => handleDeleteProduct(product.id)} variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
