import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

export default function ProductCard({ p, user, onLogin }) {
  const navigate = useNavigate();
  const [stock, setStock] = useState(p.stock);

  const price = p.priceMinor === 0 ? 'FREE' : `${(p.priceMinor / 100).toFixed(2)} ${p.currency}`;

  const handlePurchase = () => {
    if (!user) {
      alert('Please login first');
      if (onLogin) onLogin();
      return;
    }

    if (user.sub === p.sellerId) {
      alert('You cannot purchase your own items');
      return;
    }

    if (stock <= 0) {
      alert('This item is out of stock');
      return;
    }

    // Redirect to checkout page
    navigate(`/checkout?productId=${p.id}&quantity=1`);
  };

  const isOwnProduct = user && user.sub === p.sellerId;
  const isOutOfStock = stock <= 0;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-purple-100 overflow-hidden">
      <div className="relative">
        {/* Product Image */}
        <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
          {p.imageUrl ? (
            <img 
              src={p.imageUrl} 
              alt={p.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <Eye className="w-12 h-12 text-gray-400" />
            </div>
          )}
          {p.imageUrl && (
            <div className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <Eye className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {p.priceMinor === 0 && (
            <Badge className="bg-green-500 text-white hover:bg-green-600">
              FREE
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="destructive">
              Out of Stock
            </Badge>
          )}
        </div>

        {/* Wishlist Icon */}
        <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white">
          <Heart className="w-4 h-4 text-gray-600 hover:text-red-500" />
        </button>
      </div>

      <CardContent className="p-4">
        {/* Product Info */}
        <div className="space-y-2 mb-4">
          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-tight">
            {p.title}
          </h3>
          <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">
            {p.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-purple-600">
              {price}
            </span>
            <span className="text-xs text-gray-500">
              Stock: {stock}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          {isOwnProduct ? (
            <Button 
              disabled 
              className="w-full bg-gray-100 text-gray-500 hover:bg-gray-100"
              size="sm"
            >
              Your Item
            </Button>
          ) : isOutOfStock ? (
            <Button 
              disabled 
              className="w-full bg-red-100 text-red-600 hover:bg-red-100"
              size="sm"
            >
              Out of Stock
            </Button>
          ) : (
            <Button 
              onClick={handlePurchase}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-sm"
              size="sm"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy Now
            </Button>
          )}
        </div>

        {/* Metadata */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Listed {new Date(p.createdAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}