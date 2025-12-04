import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Package, Calendar, User, Store } from 'lucide-react';
import { api } from '../api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

export default function ProductDetail({ user, onLogin, onCartUpdate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data.product || data);
      } catch (err) {
        console.error('Failed to load product:', err);
        setError('Product not found');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      alert('Please login first');
      if (onLogin) onLogin();
      return;
    }

    if (user.sub === product.sellerId) {
      alert('You cannot add your own items to cart');
      return;
    }

    if (product.stock <= 0) {
      alert('This item is out of stock');
      return;
    }

    setIsAddingToCart(true);
    try {
      const response = await api.post('/cart/add', {
        productId: product.id,
        quantity: 1
      });

      if (response.data.success) {
        alert('Item added to cart!');
        if (onCartUpdate) onCartUpdate();
      } else {
        alert(response.data.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      alert(error.response?.data?.error || 'Failed to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Product not found'}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProduct = user && user.sub === product.sellerId;
  const isOutOfStock = product.stock <= 0;
  const isBusinessUser = user && user.role === 'BUSINESS';
  const price = product.priceMinor === 0 ? 'FREE' : `${(product.priceMinor / 100).toFixed(2)} ${product.currency}`;

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <Button onClick={() => navigate(-1)} variant="ghost" className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <Package className="w-24 h-24 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            {product.flashSale && (
              <Badge className="bg-red-600 text-white">
                Flash Sale {product.flashSale.savingsPercent}% OFF
              </Badge>
            )}
            {product.isB2B && (
              <Badge className="bg-blue-600 text-white">Business Seller</Badge>
            )}
            {product.priceMinor === 0 && (
              <Badge className="bg-green-500 text-white">FREE</Badge>
            )}
            {isOutOfStock && (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>

          {/* Price */}
          <div className="space-y-1">
            {product.flashSale ? (
              <>
                <p className="text-3xl font-bold text-red-600">
                  {product.currency} {(product.flashSale.discountedPriceMinor / 100).toFixed(2)}
                </p>
                <p className="text-lg text-gray-500 line-through">
                  {product.currency} {(product.priceMinor / 100).toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-3xl font-bold text-purple-600">{price}</p>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-500" />
            <span className={`font-medium ${isOutOfStock ? 'text-red-600' : 'text-gray-700'}`}>
              {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
            </span>
          </div>

          {/* Description */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{product.description || 'No description provided.'}</p>
            </CardContent>
          </Card>

          {/* Seller Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-gray-900 mb-2">Seller Information</h3>
              {product.isB2B && product.businessName && (
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">{product.businessName}</span>
                </div>
              )}
              {product.seller && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{product.seller.name || 'Anonymous Seller'}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500 text-sm">
                  Listed on {new Date(product.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="pt-4">
            {isBusinessUser ? (
              <Button disabled className="w-full bg-blue-100 text-blue-600" size="lg">
                Browse Only (Business Account)
              </Button>
            ) : isOwnProduct ? (
              <Button disabled className="w-full bg-gray-100 text-gray-500" size="lg">
                This is Your Item
              </Button>
            ) : isOutOfStock ? (
              <Button disabled className="w-full bg-red-100 text-red-600" size="lg">
                Out of Stock
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


