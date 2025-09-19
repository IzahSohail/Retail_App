import React, { useEffect, useState } from 'react';
import { api } from '../api';
import ProductCard from './ProductCard';

export default function ProductsList({ user, onLogin, onCartUpdate }) {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const loadMore = async (resetItems = false, customSearchQuery = null) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (nextCursor && !resetItems) params.set('cursor', nextCursor);
      
      // Use custom search query if provided, otherwise use current state
      const queryToUse = customSearchQuery !== null ? customSearchQuery : searchQuery;
      if (queryToUse && queryToUse.trim()) {
        params.set('q', queryToUse.trim());
      }

      const apiUrl = `/products?${params.toString()}`;
      
      const { data } = await api.get(apiUrl);

      if (resetItems) {
        setItems(data.items);
      } else {
        setItems(prev => [...prev, ...data.items]);
      }
      
      setNextCursor(data.nextCursor || null);
      if (!initialized) setInitialized(true);
    } catch (e) {
      console.error(e);
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (searchQuery.trim() === '') {
      // If search is empty, reset to show all products
      setIsSearching(false);
      setNextCursor(null);
      await loadMore(true, ''); // Pass empty string to clear search
      return;
    }
    
    setIsSearching(true);
    setNextCursor(null);
    await loadMore(true, searchQuery.trim()); // Pass current search query
  };

  const clearSearch = async () => {
    setSearchQuery('');
    setIsSearching(false);
    setNextCursor(null);
    await loadMore(true, ''); // Pass empty string to clear search
  };

  useEffect(() => {
    // Load initial products only once when component mounts
    loadMore();
  }, []); // Empty dependency array ensures this runs only once

  return (
    <section className="mt-6">
      {/* Search Bar */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for items..."
              className="w-full h-12 px-4 pr-24 text-lg bg-white/80 border border-purple-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
            <div className="absolute right-2 top-2 flex gap-1">
              <button 
                type="submit" 
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-md hover:from-purple-500 hover:to-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              {isSearching && (
                <button 
                  type="button"
                  onClick={clearSearch}
                  disabled={loading}
                  className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {isSearching ? `Search Results for "${searchQuery}"` : 'Latest Listings'}
        </h2>
        {items.length > 0 && (
          <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
            {items.length} items available
          </div>
        )}
      </div>

      {!initialized && loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2 text-gray-600">Loading…</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {isSearching && items.length === 0 && !loading && initialized && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No products found for "{searchQuery}". Try a different search term.
          </p>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(p => <ProductCard key={p.id} p={p} user={user} onLogin={onLogin} onCartUpdate={onCartUpdate} />)}
      </div>

      {/* Load More */}
      {nextCursor && (
        <div className="text-center mt-12">
          <button 
            onClick={() => loadMore(false)} 
            disabled={loading}
            className="px-8 py-3 bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? 'Loading…' : `See more ${isSearching ? 'results' : 'products'}`}
          </button>
        </div>
      )}
      
      {initialized && items.length > 0 && !nextCursor && (
        <div className="text-center mt-12 text-gray-500">
          {isSearching ? 'No more search results.' : 'No more items.'}
        </div>
      )}
    </section>
  );
}
