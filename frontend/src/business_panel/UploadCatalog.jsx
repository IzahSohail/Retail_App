import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Upload, FileText, CheckCircle, AlertCircle, Package } from 'lucide-react';

export default function UploadCatalog({ businessInfo }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/business/products');
      setProducts(res.data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setMessage({
        type: 'error',
        text: 'Please select a file to upload'
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('catalog', file);

      const res = await api.post('/business/catalog', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage({
        type: 'success',
        text: res.data.message,
        details: res.data
      });

      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('catalog-file');
      if (fileInput) fileInput.value = '';
      
      // Refresh products list
      fetchProducts();
    } catch (err) {
      console.error('Error uploading catalog:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to upload catalog'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Product Catalog</h2>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Required Format</h3>
          <p className="text-sm text-blue-700 mb-2">Your catalog file must include the following columns:</p>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            <li><strong>title</strong> - Product name</li>
            <li><strong>description</strong> - Product description</li>
            <li><strong>price</strong> - Price in AED (e.g., 99.99)</li>
            <li><strong>category</strong> - Category name (as of now we only sell items within categories: Electronics, Books, Furniture, Clothing, Sports, Other)</li>
            <li><strong>stock</strong> - Available quantity (e.g., 10)</li>
            <li><strong>imageUrl</strong> (optional) - Product image URL</li>
          </ul>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {message.text}
                </p>
                {message.details?.summary && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-sm text-green-700">
                       <strong>Summary:</strong> {message.details.summary.loaded} loaded, {message.details.summary.validated} validated, {message.details.summary.failed} failed
                    </p>
                  </div>
                )}
                {message.details && message.details.failedProducts && message.details.failedProducts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="font-semibold text-red-800 mb-2">
                      ⚠️ Failed to add {message.details.failedProducts.length} products:
                    </p>
                    <ul className="text-sm text-red-700 space-y-2 max-h-60 overflow-y-auto">
                      {message.details.failedProducts.map((item, idx) => (
                        <li key={idx} className="border-b border-red-100 pb-2 last:border-0">
                          <strong>{item.product}</strong> {item.row && `(Row ${item.row})`}
                          {item.errors && (
                            <ul className="ml-4 mt-1 list-disc list-inside">
                              {item.errors.map((error, errIdx) => (
                                <li key={errIdx}>{error}</li>
                              ))}
                            </ul>
                          )}
                          {item.reason && !item.errors && (
                            <div className="ml-4 mt-1">{item.reason}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full px-6 py-12 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <span className="text-lg text-gray-700 font-semibold">
                  {file ? file.name : 'Click to upload your catalog'}
                </span>
                <p className="text-sm text-gray-500 mt-2">Supports CSV and JSON files (max 10MB)</p>
              </div>
              <input
                type="file"
                id="catalog-file"
                accept=".csv,.json,application/json,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !file}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3"
            >
              {loading ? 'Uploading...' : 'Upload Catalog'}
            </Button>
          </div>
        </form>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Your Products ({products.length})</h3>

        {loadingProducts ? (
          <p className="text-gray-600">Loading products...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No products uploaded yet. Upload your first catalog above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Added</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.title}
                            className="w-10 h-10 object-cover rounded mr-3"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{product.title}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{product.category?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-700 font-semibold">
                      {product.currency} {(product.priceMinor / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{product.stock}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

