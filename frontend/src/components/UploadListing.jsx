import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Camera, DollarSign, Package, Tag, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { api } from '../api';

export default function UploadListing({ user }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'AED',
    categoryId: '',
    stock: 1
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      alert('Please login first to upload a listing');
      navigate('/');
      return;
    }

    // Load categories
    const loadCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, [user, navigate]);

  // Cleanup image preview URL on component unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert('Image file size must be less than 5MB');
        e.target.value = '';
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title.trim()) {
      alert('Please enter a product title');
      return;
    }
    if (!formData.description.trim()) {
      alert('Please enter a description');
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      alert('Please enter a valid price');
      return;
    }
    if (!formData.categoryId) {
      alert('Please select a category');
      return;
    }

    setLoading(true);
    try {
      const priceMinor = Math.round(parseFloat(formData.price) * 100); // Convert to minor units
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('priceMinor', priceMinor.toString());
      formDataToSend.append('currency', formData.currency);
      formDataToSend.append('categoryId', formData.categoryId);
      formDataToSend.append('stock', (parseInt(formData.stock) || 1).toString());
      
      // Add image file if selected
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
        console.log('Uploading image:', selectedImage.name, selectedImage.size, 'bytes');
      }
      
      const response = await api.post('/listings', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const hasImage = response.data.product.imageUrl;
        const message = hasImage 
          ? 'Listing uploaded successfully with image!' 
          : 'Listing uploaded successfully!';
        alert(message);
        navigate('/');
      } else {
        alert('Failed to create listing. Please try again.');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
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
              <p className="text-xs text-gray-500">Create New Listing</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-800 mb-4">List Your Item</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Share your unused items with fellow students. From textbooks to electronics, help others while earning some cash.
          </p>
        </div>

        {/* Upload Form */}
        <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-3">
              <Tag className="w-6 h-6 text-purple-600" />
              Create Your Listing
            </CardTitle>
            <p className="text-gray-600">Fill in the details below to list your item</p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Image Upload Section */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-600" />
                  Photos
                </Label>
                
                {imagePreview ? (
                  // Show image preview
                  <div className="border-2 border-purple-200 rounded-xl p-4 bg-white">
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg mb-4"
                        style={{width: '100%', height: '12rem', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1rem'}}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                          document.getElementById('image-upload').value = '';
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                        style={{position: 'absolute', top: '0.5rem', right: '0.5rem', backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer'}}
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full mt-2" 
                      onClick={() => document.getElementById('image-upload').click()}
                    >
                      Change Image
                    </Button>
                  </div>
                ) : (
                  // Show upload area
                  <div className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer bg-purple-50">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-800 mb-2">Add photos of your item</p>
                    <p className="text-sm text-gray-600 mb-4">Drag and drop or click to upload</p>
                    <Button type="button" variant="outline" className="bg-transparent" onClick={() => document.getElementById('image-upload').click()}>
                      Choose Files
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported: JPEG, PNG, GIF, WebP • Max: 5MB
                    </p>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
              </div>

              {/* Product Title */}
              <div className="space-y-3">
                <Label htmlFor="title" className="text-lg font-semibold text-gray-800">
                  Product Title *
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., MacBook Pro 13 inch, Calculus Textbook, Study Desk..."
                  value={formData.title}
                  onChange={handleInputChange}
                  className="h-12 text-lg bg-white/80 border-purple-200 focus:border-purple-400 shadow-sm"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-lg font-semibold text-gray-800">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe your item's condition, features, and any important details..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="min-h-[120px] text-lg bg-white/80 border-purple-200 focus:border-purple-400 shadow-sm resize-none"
                  required
                />
              </div>

              {/* Price and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-3">
                  <Label htmlFor="price" className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    Price *
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="h-12 text-lg bg-white/80 border-purple-200 focus:border-purple-400 shadow-sm"
                    required
                  />
                  <p className="text-sm text-gray-500">Enter 0 for free items</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="currency" className="text-lg font-semibold text-gray-800">
                    Currency
                  </Label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="h-12 w-full text-lg bg-white/80 border border-purple-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                  >
                    <option value="AED">AED (د.إ)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Category and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="categoryId" className="text-lg font-semibold text-gray-800">
                    Category *
                  </Label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className="h-12 w-full text-lg bg-white/80 border border-purple-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="stock" className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Quantity
                  </Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="1"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="h-12 text-lg bg-white/80 border-purple-200 focus:border-purple-400 shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-8">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full h-14 text-lg bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Upload className="w-5 h-5 mr-3" />
                  {loading ? 'Publishing...' : 'Publish Listing'}
                </Button>
                <p className="text-center text-sm text-gray-500 mt-4">
                  By publishing, you agree to our terms of service and community guidelines
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}