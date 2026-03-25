import React, { useEffect, useRef, useState } from 'react';
import { diseaseAPI } from '../services/api';
import { Upload, ScanLine, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const DiseaseDetection = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const formatClassName = (name) => {
    if (!name) return 'Unknown or unsupported leaf';
    return name.replace(/___/g, ' - ').replace(/_/g, ' ');
  };

  const formatConfidence = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const stopCamera = () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async () => {
    setCameraError('');
    setError('');
    setResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser. Please use file upload instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);

      // Ensure the video element exists before attaching stream.
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 0);
    } catch (e) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (name === 'NotFoundError') {
        setCameraError('No camera device found. Please use file upload instead.');
      } else {
        setCameraError('Failed to access camera. Please try again or use file upload.');
      }
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const setSelectedImageFile = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type?.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, or WebP).');
      setFile(null);
      setPreview(null);
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`Image must be smaller than ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setError('');
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('Could not capture photo. Please try again.');
      return;
    }
    const captured = new File([blob], `leaf_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
    setSelectedImageFile(captured);
    closeCamera();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setSelectedImageFile(selectedFile);
  };

  const handleDetect = async () => {
    if (!file) {
      setError('Please select an image first');
      return;
    }
    if (!selectedCrop) {
      setError('Please select the crop type first (Tomato, Potato, or Pepper Bell).');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('crop', selectedCrop);

      const response = await diseaseAPI.detect(formData);
      setResult(response.data);
      setError(''); // Clear any previous errors
    } catch (err) {
      setResult(null);
      const msg = err.response?.data?.error;
      if (err.response?.status === 400) {
        setError(msg || 'Invalid image file. Please upload a valid image (PNG, JPG, or JPEG).');
      } else if (err.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (err.response?.status === 404) {
        setError(msg || 'Model not found. Please contact support.');
      } else if (err.response?.status === 413) {
        setError(msg || 'Image file is too large. Please upload an image smaller than 10MB.');
      } else if (err.response?.status >= 500) {
        setError(msg || 'Server error. Please try again later or contact support if the problem persists.');
      } else if (err.message === 'Network Error' || !err.response) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(msg || 'Failed to detect disease. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setCameraError('');
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Plant Disease Detection</h1>
        <p className="text-gray-600 mt-1">Upload an image to detect plant diseases using AI</p>
        <p className="text-sm text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Supported crops: <strong>Tomato</strong>, <strong>Potato</strong>, and <strong>Pepper Bell</strong> leaves only. Select the crop first; unsupported crops will be rejected with no diagnosis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Image</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Crop Type (required)
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">Select crop type</option>
              <option value="tomato">Tomato</option>
              <option value="potato">Potato</option>
              <option value="pepper">Pepper Bell</option>
            </select>
          </div>
          
          {!preview ? (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, JPEG or WebP (max 10MB). Use a clear leaf photo (close-up, good light, leaf fills most of the frame).
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  capture="environment"
                  onChange={handleFileChange}
                />
              </label>

              <button
                type="button"
                onClick={openCamera}
                className="w-full border border-gray-300 bg-white text-gray-900 py-3 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              >
                Use Camera
              </button>

              {cameraError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
                  {cameraError}
                </div>
              )}
            </div>
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

          {cameraOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-900">Camera</p>
                    <p className="text-xs text-gray-600">Take a clear close-up of the leaf.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <div className="bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-80 object-contain"
                      onLoadedMetadata={() => {
                        if (videoRef.current) videoRef.current.play?.();
                      }}
                    />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                    >
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={closeCamera}
                      className="border border-gray-300 bg-white text-gray-900 py-3 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                    >
                      Cancel
                    </button>
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
                      {cameraError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex gap-3">
              <AlertCircle className="flex-shrink-0 mt-0.5" size={22} />
              <p className="text-sm leading-relaxed">{error}</p>
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
              <div
                className={`p-4 rounded-lg border-2 ${
                  result.is_unknown
                    ? 'bg-yellow-50 border-yellow-300'
                    : result.predicted_class?.includes('Healthy')
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-start space-x-3 mb-3">
                  {result.is_unknown ? (
                    <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
                  ) : result.predicted_class?.includes('Healthy') ? (
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
                  ) : (
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {formatClassName(result.predicted_class)}
                    </h3>
                    {result.is_unknown ? (
                      <p className="text-sm text-yellow-800 font-medium">
                        Unable to identify this image with sufficient confidence
                      </p>
                    ) : (
                      <p className="text-sm text-gray-700">
                        Confidence:{' '}
                        <span className="font-semibold">{formatConfidence(result.confidence)}</span>
                      </p>
                    )}
                  </div>
                </div>
                {result.is_unknown && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-xs text-yellow-700 italic">
                      The model's confidence level ({formatConfidence(result.confidence)}) is below the threshold for reliable detection. 
                      This may indicate the image is not a plant leaf, shows an untrained disease, or has quality issues.
                    </p>
                  </div>
                )}
              </div>

              {result.warning && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900">
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">Caution:</span> {result.warning}
                  </p>
                </div>
              )}

              {result.treatment && (
                <div className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Treatment & Prevention Guide
                  </h3>
                  
                  {/* General Treatment */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-2">General Treatment</h4>
                        <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">
                          {typeof result.treatment === 'string' ? result.treatment : (result.treatment.general || 'No treatment information available.')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prevention */}
                  {result.treatment.prevention && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-900 mb-2">Prevention Tips</h4>
                          <p className="text-sm text-yellow-800 whitespace-pre-line leading-relaxed">
                            {result.treatment.prevention}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Organic Solutions */}
                  {result.treatment.organic && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900 mb-2">Organic Solutions</h4>
                          <p className="text-sm text-green-800 whitespace-pre-line leading-relaxed">
                            {result.treatment.organic}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!result.is_unknown && result.top_3 && result.top_3.length > 1 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Other Possible Diagnoses</h4>
                  <div className="space-y-2">
                    {result.top_3.slice(1).map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">
                          {formatClassName(item.class)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatConfidence(item.confidence)} confidence
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="flex-shrink-0 mt-0.5" size={24} />
                <div>
                  <p className="font-semibold text-red-900 mb-1">No results</p>
                  <p className="text-sm leading-relaxed">{error}</p>
                </div>
              </div>
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









