import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../api';

export default function UserListings({ user }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      alert('Please login first to view your listings');
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Load user's listings
  useEffect(() => {
    const loadListings = async () => {
      try {
        const response = await api.get('/my-listings');
        setListings(response.data.listings);
      } catch (error) {
        console.error('Failed to load listings:', error);
        alert('Failed to load your listings');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadListings();
    }
  }, [user]);

  const handleDelete = async (listingId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(listingId);
    try {
      const response = await api.delete(`/listings/${listingId}`);
      
      if (response.data.success) {
        alert('Listing deleted successfully!');
        // Remove from local state
        setListings(prev => prev.filter(listing => listing.id !== listingId));
      } else {
        alert(response.data.error || 'Failed to delete listing');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete listing. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                Falcon Market
              </h1>
              <p className="text-xs text-gray-500">Your Listings</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Your Active Listings</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your products and track their performance
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Loading your listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No listings yet</h3>
            <p className="text-gray-600 mb-6">Start selling by creating your first listing</p>
            <Link to="/upload-listing">
              <Button className="bg-gradient-to-r from-purple-400 to-purple-600 text-white">
                Create First Listing
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{listings.length}</div>
                  <div className="text-sm text-gray-600">Active Listings</div>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {listings.reduce((sum, item) => sum + item.stock, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Stock</div>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {listings.filter(item => item.stock > 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Available Items</div>
                </CardContent>
              </Card>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => {
                const price = listing.priceMinor === 0 ? 'FREE' : `${(listing.priceMinor / 100).toFixed(2)} ${listing.currency}`;
                const isDeleting = deleting === listing.id;
                const isOutOfStock = listing.stock <= 0;
                
                return (
                  <Card key={listing.id} className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="relative">
                      {/* Product Image */}
                      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden rounded-t-lg">
                        {listing.imageUrl ? (
                          <img 
                            src={listing.imageUrl} 
                            alt={listing.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <Eye className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        {listing.imageUrl && (
                          <div className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <Eye className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        {isOutOfStock ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : listing.priceMinor === 0 ? (
                          <Badge className="bg-green-500 hover:bg-green-600">FREE</Badge>
                        ) : (
                          <Badge variant="secondary">Available</Badge>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Product Info */}
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                            {listing.title}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {listing.description}
                          </p>
                          
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-bold text-purple-600">
                              {price}
                            </span>
                            <span className="text-sm text-gray-500">
                              Stock: {listing.stock}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Category: {listing.category.name}</span>
                            <span>Listed: {new Date(listing.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 border-purple-200 hover:bg-purple-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(listing.id, listing.title)}
                            disabled={isDeleting}
                            className="flex-1 border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Add New Listing */}
            <div className="text-center mt-12">
              <Link to="/upload-listing">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Add New Listing
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}