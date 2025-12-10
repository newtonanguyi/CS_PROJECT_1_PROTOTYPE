import React, { useState } from 'react';
import { diseaseAPI } from '../services/api';
import { Upload, ScanLine, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const DiseaseDetection = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setResult(null);
        setError('');
      } else {
        setError('Please select an image file');
      }
    }
  };

  const handleDetect = async () => {
    if (!file) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await diseaseAPI.detect(formData);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to detect disease. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Plant Disease Detection</h1>
        <p className="text-gray-600 mt-1">Upload an image to detect plant diseases using AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Image</h2>
          
          {!preview ? (
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, or JPEG (MAX. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
              >
                <span className="text-gray-600">×</span>
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center space-x-2">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            onClick={handleDetect}
            disabled={!file || loading}
            className="mt-4 w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Detecting...</span>
              </>
            ) : (
              <>
                <ScanLine size={20} />
                <span>Detect Disease</span>
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detection Results</h2>
          
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                result.predicted_class?.includes('Healthy')
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {result.predicted_class?.includes('Healthy') ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <AlertCircle className="text-red-600" size={20} />
                  )}
                  <h3 className="font-semibold text-gray-900">
                    {result.predicted_class?.replace(/_/g, ' ').replace(/___/g, ' - ')}
                  </h3>
                </div>
                <p className="text-sm text-gray-700">
                  Confidence: <span className="font-semibold">{(result.confidence * 100).toFixed(1)}%</span>
                </p>
              </div>

              {result.treatment && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Treatment</h4>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                      {result.treatment.general || result.treatment}
                    </p>
                  </div>
                  {result.treatment.prevention && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Prevention</h4>
                      <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                        {result.treatment.prevention}
                      </p>
                    </div>
                  )}
                  {result.treatment.organic && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Organic Solutions</h4>
                      <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                        {result.treatment.organic}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {result.top_3 && result.top_3.length > 1 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Other Possible Diagnoses</h4>
                  <div className="space-y-2">
                    {result.top_3.slice(1).map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">
                          {item.class?.replace(/_/g, ' ').replace(/___/g, ' - ')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {(item.confidence * 100).toFixed(1)}% confidence
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <ScanLine size={48} className="mb-4" />
              <p>Upload an image and click detect to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiseaseDetection;







