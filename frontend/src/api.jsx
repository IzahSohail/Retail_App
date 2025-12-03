import axios from 'axios';

const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:3001';
export const api = axios.create({
  baseURL: `${backendBase}/api`,
  withCredentials: true,
});

// Products endpoints
export const fetchProducts = (params = {}) => api.get('/products', { params });

// Flash Sales endpoints
export const getActiveFlashSales = () => api.get('/admin/flash-sales/active');
export const createFlashSale = (saleData) => api.post('/admin/flash-sales', saleData);
export const getFlashSales = () => api.get('/admin/flash-sales');
export const deleteFlashSale = (id) => api.delete(`/admin/flash-sales/${id}`);
export const updateFlashSaleProducts = (id, productIds) => 
  api.patch(`/admin/flash-sales/${id}/products`, { productIds });

// Admin - Business endpoints
export const fetchBusinesses = () => api.get('/admin/businesses');
export const verifyBusiness = (id, action, reason) => 
  api.post(`/admin/businesses/${id}/verify`, { action, reason });

// Admin - Stats
export const getDashboardStats = () => api.get('/admin/stats');

// Admin - Users (if implemented)
export const fetchUsers = () => api.get('/admin/users');

// Admin - Purchases (with filters)
export const fetchAdminPurchases = (params = {}) => api.get('/admin/purchases', { params });

// Pricing endpoints
export const calculateDiscount = (originalPrice, discountType, discountValue) => 
  api.post('/pricing/calculate-discount', { originalPrice, discountType, discountValue });

export const calculateOrderTotal = (items, options) => 
  api.post('/pricing/calculate-order', { items, options });

// Verification endpoints
export const requestSellerVerification = (data) => 
  api.post('/verification/request-seller', data);

export const getVerificationStatus = () => 
  api.get('/verification/status');

// Default export
export default api;
