import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Button } from '../components/ui/button';

export default function BusinessRegister() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const backendBase = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:3001';

  useEffect(() => {
    // Check if user is already logged in
    api.get('/profile')
      .then(r => {
        setUser(r.data.user);
        // If already logged in and business role, redirect to dashboard
        if (r.data.user.role === 'BUSINESS') {
          window.location.href = '/business/dashboard';
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        // Not logged in
        setLoading(false);
      });
  }, []);

  const handleLogin = () => {
    window.location.href = `${backendBase}/login?type=business&screen_hint=signup`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-lg shadow-lg max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-purple-700 mb-4 text-center">
          Sell on Falcon Market
        </h1>
        <p className="text-xl text-gray-600 mb-8 text-center">
          Register and upload your catalog to our marketplace
        </p>

        <div className="border border-purple-200 bg-purple-50 p-6 rounded-md mb-8">
          <h3 className="font-semibold text-purple-900 mb-3">Why sell with us?</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Reach thousands of university students</li>
            <li>✓ Easy catalog upload (CSV format)</li>
            <li>✓ Secure payment processing</li>
            <li>✓ Dashboard to manage your products</li>
          </ul>
        </div>

        {!user ? (
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Sign in or create an account to get started
            </p>
            <Button
              onClick={handleLogin}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3 text-lg"
            >
              Login / Sign up as Business
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              You're logged in as <strong>{user.email}</strong>
            </p>
            <p className="text-gray-600 mb-6">
              Your account role: <strong>{user.role}</strong>
            </p>

          </div>
        )}
      </div>
    </div>
  );
}

