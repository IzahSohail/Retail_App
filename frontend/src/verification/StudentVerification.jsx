import React, { useState } from 'react';

const StudentVerification = ({ onVerificationSubmitted }) => {
  const [formData, setFormData] = useState({
    studentId: '',
    university: '',
    phoneNumber: '',
    additionalInfo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const universities = [
    'American University of Sharjah',
    'UAE University',
    'Khalifa University',
    'University of Dubai',
    'American University of Dubai',
    'Canadian University Dubai',
    'Heriot-Watt University Dubai',
    'Middlesex University Dubai',
    'New York University Abu Dhabi',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/verification/request-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Verification request submitted successfully! You will be notified once reviewed.');
        setFormData({
          studentId: '',
          university: '',
          phoneNumber: '',
          additionalInfo: ''
        });
        if (onVerificationSubmitted) {
          onVerificationSubmitted(data.verificationRequest);
        }
      } else {
        setError(data.error || 'Failed to submit verification request');
      }
    } catch (err) {
      console.error('Verification request error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">🎓 Apply to Become a Seller</h2>
        <p className="text-gray-600 leading-relaxed">
          To sell on our platform, you need to verify your student status. This helps maintain trust and safety in our community.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg font-medium">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg font-medium">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <label htmlFor="studentId" className="block mb-2 font-semibold text-gray-700 text-sm">
            Student ID *
          </label>
          <input
            type="text"
            id="studentId"
            name="studentId"
            value={formData.studentId}
            onChange={handleInputChange}
            placeholder="Enter your student ID"
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-colors focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="university" className="block mb-2 font-semibold text-gray-700 text-sm">
            University *
          </label>
          <select
            id="university"
            name="university"
            value={formData.university}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-colors focus:outline-none focus:border-blue-500"
          >
            <option value="">Select your university</option>
            {universities.map(uni => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block mb-2 font-semibold text-gray-700 text-sm">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="+971 XX XXX XXXX"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-colors focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="additionalInfo" className="block mb-2 font-semibold text-gray-700 text-sm">
            Additional Information (Optional)
          </label>
          <textarea
            id="additionalInfo"
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
            placeholder="Any additional information that might help verify your student status..."
            rows="4"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-colors focus:outline-none focus:border-blue-500 resize-vertical"
          />
        </div>

        <div className="p-5 bg-gray-50 rounded-lg border-l-4 border-blue-500">
          <h4 className="text-base font-semibold text-gray-800 mb-4">Verification Requirements:</h4>
          <ul className="space-y-2 text-gray-600 leading-relaxed ml-5 list-disc">
            <li>Valid student ID from a recognized university</li>
            <li>Active email address (preferably .edu)</li>
            <li>Accurate personal information</li>
            <li>Compliance with our terms of service</li>
          </ul>
        </div>

        <button 
          type="submit" 
          className="w-full px-4 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg text-base hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit Verification Request'}
        </button>
      </form>
    </div>
  );
};

export default StudentVerification;

