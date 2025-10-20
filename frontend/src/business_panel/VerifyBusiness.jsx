import React, { useState } from 'react';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

export default function VerifyBusiness({ businessInfo, onUpdate }) {
  const [formData, setFormData] = useState({
    businessName: businessInfo?.b2b?.businessName || '',
    businessDescription: businessInfo?.b2b?.businessDescription || '',
    registeredAddress: businessInfo?.b2b?.registeredAddress || '',
  });
  const [files, setFiles] = useState({
    tradeLicense: null,
    establishmentCard: null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setFiles({
        ...files,
        [name]: selectedFiles[0]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('businessName', formData.businessName);
      formDataToSend.append('businessDescription', formData.businessDescription);
      formDataToSend.append('registeredAddress', formData.registeredAddress);

      if (files.tradeLicense) {
        formDataToSend.append('tradeLicense', files.tradeLicense);
      }
      if (files.establishmentCard) {
        formDataToSend.append('establishmentCard', files.establishmentCard);
      }

      const res = await api.post('/business/verify', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage({
        type: 'success',
        text: res.data.message || 'Verification documents submitted successfully!'
      });

      // Reset file inputs
      setFiles({ tradeLicense: null, establishmentCard: null });
      
      // Call parent to refresh data
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error submitting verification:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to submit verification documents'
      });
    } finally {
      setLoading(false);
    }
  };

  const b2bStatus = businessInfo?.b2b?.status || 'PENDING';

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Verify Your Business</h2>

      {b2bStatus === 'UNDER_REVIEW' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Documents Under Review</h3>
            <p className="text-sm text-blue-700">
              Your verification documents have been submitted and are currently being reviewed by our team. 
              You will be notified once the review is complete.
            </p>
          </div>
        </div>
      )}

      {b2bStatus === 'VERIFIED' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Business Verified!</h3>
            <p className="text-sm text-green-700">
              Your business has been successfully verified. You can now upload your product catalog.
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            placeholder="Enter your business name"
            required
          />
        </div>

        <div>
          <Label htmlFor="businessDescription">Business Description *</Label>
          <Textarea
            id="businessDescription"
            name="businessDescription"
            value={formData.businessDescription}
            onChange={handleInputChange}
            placeholder="Describe your business and what products you offer"
            rows={4}
            required
          />
        </div>

        <div>
          <Label htmlFor="registeredAddress">Registered Address *</Label>
          <Textarea
            id="registeredAddress"
            name="registeredAddress"
            value={formData.registeredAddress}
            onChange={handleInputChange}
            placeholder="Enter your business registered address"
            rows={3}
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="tradeLicense">Trade License (PDF) *</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {files.tradeLicense ? files.tradeLicense.name : 'Click to upload Trade License'}
                  </span>
                </div>
                <input
                  type="file"
                  id="tradeLicense"
                  name="tradeLicense"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  required={!businessInfo?.b2b?.tradeLicenseUrl}
                />
              </label>
            </div>
            {businessInfo?.b2b?.tradeLicenseUrl && (
              <p className="text-xs text-green-600 mt-1">✓ Already uploaded</p>
            )}
          </div>

          <div>
            <Label htmlFor="establishmentCard">Establishment Card (PDF) *</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {files.establishmentCard ? files.establishmentCard.name : 'Click to upload Establishment Card'}
                  </span>
                </div>
                <input
                  type="file"
                  id="establishmentCard"
                  name="establishmentCard"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  required={!businessInfo?.b2b?.establishmentCardUrl}
                />
              </label>
            </div>
            {businessInfo?.b2b?.establishmentCardUrl && (
              <p className="text-xs text-green-600 mt-1">✓ Already uploaded</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3"
          >
            {loading ? 'Submitting...' : b2bStatus === 'PENDING' ? 'Submit for Verification' : 'Update Information'}
          </Button>
        </div>
      </form>
    </div>
  );
}

