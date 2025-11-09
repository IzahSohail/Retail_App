import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Edit3, Save, X, Mail, Calendar, Clock, Camera, ShoppingBag, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../api';

export default function ViewProfile({ user }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    memberSince: '',
    lastLogin: '',
    creditMinor: 0,
  });
  // Stats commented out for now - will implement later
  // const [stats, setStats] = useState({
  //   itemsSold: 0,
  //   activeListings: 0,
  //   rating: 0
  // });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Load profile data
    const loadProfile = async () => {
      try {
        const response = await api.get('/profile');
        const userData = response.data.user;
        
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          gender: userData.gender || '',
          dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
          memberSince: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : '',
          lastLogin: userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : '',
          creditMinor: userData.creditMinor || 0,
        });

        // Load stats (commented out for now - will implement later)
        // setStats({
        //   itemsSold: 12,
        //   activeListings: 5,
        //   rating: 4.9
        // });
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, [user, navigate]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        name: profileData.name.trim(),
        gender: profileData.gender || null,
        dateOfBirth: profileData.dateOfBirth || null,
      };

      const response = await api.put('/profile', updateData);
      
      if (response.data.success) {
        alert('Profile updated successfully!');
        setIsEditing(false);
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data if needed - reload from server
    window.location.reload();
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
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
              <p className="text-xs text-gray-500">Your Profile</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <User className="w-12 h-12 text-white" />
            </div>
            <Button
              size="sm"
              className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-white shadow-lg border border-purple-100"
            >
              <Camera className="w-4 h-4 text-gray-600" />
            </Button>
          </div>
          <h2 className="text-4xl font-bold text-gray-800 mb-2">{profileData.name || 'User'}</h2>
          <p className="text-lg text-gray-600 mb-4">{profileData.email}</p>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="px-4 py-2">
              Member since {new Date(profileData.memberSince).getFullYear() || '2025'}
            </Badge>
          </div>
        </div>

        {/* Profile Information Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <User className="w-6 h-6 text-purple-600" />
                Profile Information
              </CardTitle>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-8">
                {/* Name */}
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-lg font-semibold text-gray-800">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="h-12 text-lg bg-white/80 border-purple-200 focus:border-purple-400 shadow-sm"
                  />
                </div>

                {/* Email */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-purple-600" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={profileData.email}
                    disabled
                    className="h-12 text-lg bg-gray-100 border-purple-200 text-gray-500"
                  />
                  <p className="text-sm text-gray-500">
                    Email cannot be changed - verified with university
                  </p>
                </div>

                {/* Gender */}
                <div className="space-y-3">
                  <Label htmlFor="gender" className="text-lg font-semibold text-gray-800">
                    Gender
                  </Label>
                  <select
                    value={profileData.gender}
                    onChange={(e) => handleInputChange("gender", e.target.value)}
                    className="h-12 w-full text-lg bg-white/80 border border-purple-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div className="space-y-3">
                  <Label htmlFor="dob" className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Date of Birth
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="h-12 text-lg bg-white/80 border-purple-200 focus:border-purple-400 shadow-sm"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white shadow-lg"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                    size="lg"
                    className="flex-1 border-purple-200 hover:bg-purple-50"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-600 mb-1">Full Name</p>
                    <p className="text-lg font-semibold text-gray-800">{profileData.name || 'Not provided'}</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </p>
                    <p className="text-lg font-semibold text-gray-800">{profileData.email}</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-600 mb-1">Gender</p>
                    <p className="text-lg font-semibold text-gray-800">{profileData.gender || 'Not provided'}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date of Birth
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Member Since
                    </p>
                    <p className="text-lg font-semibold text-gray-800">{profileData.memberSince}</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Last Login
                    </p>
                    <p className="text-lg font-semibold text-gray-800">{profileData.lastLogin}</p>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <p className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-green-600" />
                      Store Credits
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      د.إ {((profileData.creditMinor || 0) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Available for purchases</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Activity Stats - Commented out for now, will implement later */}
        {/* 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.itemsSold}</p>
              <p className="text-sm text-gray-600">Items Sold</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.activeListings}</p>
              <p className="text-sm text-gray-600">Active Listings</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.rating}</p>
              <p className="text-sm text-gray-600">Rating</p>
            </CardContent>
          </Card>
        </div>
        */}
      </div>
    </div>
  );
}