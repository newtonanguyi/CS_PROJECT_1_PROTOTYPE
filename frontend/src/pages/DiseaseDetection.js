import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, MoveRight, SendHorizontal } from 'lucide-react';
import { diseaseAPI, fieldSamplesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LeafOutlineIcon = ({ size = 34, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M20.5 3.5c-7.4.6-12.2 4.7-14.6 8.9C3.3 16.9 4.4 20 8 20c4.2 0 7.7-3.3 9.2-7.2 1-2.6 1.6-6.3 3.3-9.3Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M6.2 17.8c2.2-3.2 6.6-6.9 12.2-9.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const HealthyCheckmark = () => (
  <svg
    className="td-checkmark"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="td-checkmark-path"
    />
  </svg>
);

const severityIcon = (stage) => {
  const s = String(stage || '').toLowerCase();
  if (s === 'early') return '🌱';
  if (s === 'mid') return '⚠️';
  if (s === 'late') return '🔴';
  return '';
};

const severityBadge = (stage) => {
  const s = String(stage || '').toLowerCase();
  if (s === 'early') return 'bg-green-100 text-green-900 border-green-200';
  if (s === 'mid') return 'bg-accent-100 text-accent-900 border-accent-200';
  if (s === 'late') return 'bg-red-100 text-red-900 border-red-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
};

const diseaseTitleClass = (statusValue) => {
  if (statusValue === 'detected') return 'text-red-700';
  if (statusValue === 'healthy') return 'text-primary-700';
  return 'text-slate-900';
};

const DiseaseDetection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [feedbackChoice, setFeedbackChoice] = useState(null); // true/false
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const coverage = useMemo(() => {
    const v = Number(result?.leaf_coverage_pct);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : null;
  }, [result?.leaf_coverage_pct]);

  const showAffectedRegions = useMemo(() => {
    // Only show "affected regions" when disease was detected (Early/Late Blight).
    // Healthy leaves should not display an attention/lesion overlay.
    return result?.status === 'detected' && !!result?.gradcam_image;
  }, [result?.gradcam_image, result?.status]);

  const onPickFile = (f) => {
    setError('');
    setFeedbackChoice(null);
    setFeedbackNotes('');
    setFeedbackMessage('');
    setResult(null);

    if (!f) return;
    if (!f.type?.startsWith('image/')) {
      setError('Upload a JPG or PNG image.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const stopCamera = () => {
    const s = streamRef.current;
    if (s) {
      try {
        s.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
    }
    streamRef.current = null;
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setCameraError('');
  };

  const openCamera = async () => {
    setCameraError('');
    if (!navigator?.mediaDevices?.getUserMedia) {
      // Silent fallback
      cameraInputRef.current?.click();
      return;
    }
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch {
      // Permission denied / no camera available — silently fallback to file picker capture input.
      setCameraOpen(false);
      cameraInputRef.current?.click();
    }
  };

  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 0;
    const h = video.videoHeight || 0;
    if (!w || !h) return;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return;
    const f = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
    closeCamera();
    onPickFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    onPickFile(f);
  };

  const onDetect = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await diseaseAPI.detect(fd);
      setResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(msg || 'Could not analyze the photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    closeCamera();
    setFile(null);
    setResult(null);
    setError('');
    setFeedbackChoice(null);
    setFeedbackNotes('');
    setFeedbackMessage('');
    sessionStorage.removeItem('tomato_advisory_bootstrap');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
  };

  const pushChatBootstrap = () => {
    if (!result || result.status === 'uncertain') return;
    const disease = result.disease;
    const severity = result.severity_stage || 'Unknown';
    const conf = Number(result.confidence || 0).toFixed(1);
    const cov = coverage === null ? 'N/A' : coverage.toFixed(1);

    const ctx =
      `A farmer's tomato leaf has been diagnosed with ${disease} at ${severity} severity. ` +
      `Confidence: ${conf}%. Lesion coverage: ${cov}%. Provide specific, practical treatment advice for smallholder farmers in Uganda.`;

    sessionStorage.setItem(
      'tomato_advisory_bootstrap',
      JSON.stringify({
        message: ctx,
        detection_context: ctx,
        disease_name: disease || '',
        from_detection: true,
        autoSend: true,
      }),
    );
  };

  const submitFeedback = async () => {
    if (feedbackChoice === null || !file || !result || result.status === 'uncertain') return;
    setFeedbackLoading(true);
    setFeedbackMessage('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('predicted_disease', result.disease || '');
      fd.append('severity_stage', result.severity_stage || '');
      fd.append('confidence', String(result.confidence ?? 0));
      fd.append('lesion_count', String(result.lesion_count ?? ''));
      fd.append('leaf_coverage_pct', String(result.leaf_coverage_pct ?? ''));
      fd.append('user_confirmed', feedbackChoice ? 'true' : 'false');
      if (feedbackNotes) fd.append('farmer_notes', feedbackNotes);
      if (user?.location) fd.append('location', user.location);

      await fieldSamplesAPI.create(fd);
      setFeedbackMessage('Thank you. Your feedback helps improve accuracy for Ugandan farmers.');
    } catch {
      setFeedbackMessage('Could not submit feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      stopCamera();
    };
  }, [previewUrl]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">Upload a tomato leaf photo</h1>
        <p className="mt-2 text-slate-700">
          JPG, PNG — take the photo in natural daylight for best results.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-900">Upload a tomato leaf photo</p>

          {!previewUrl ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="mt-3 rounded-2xl border-2 border-dashed border-slate-200 bg-canvas px-5 py-8 text-center"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cg fill='none' stroke='%231B4332' stroke-opacity='0.055' stroke-width='1.2'%3E%3Cpath d='M24.5 9.2c-5.6.4-9.3 3.6-11.1 6.8-2 3.3-1.2 5.6 1.6 5.6 3.2 0 5.8-2.5 7-5.5.7-2 1.2-4.8 2.5-6.9Z'/%3E%3Cpath d='M11.4 20.4c1.7-2.5 5-5.3 9.2-7.2' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E\")",
                backgroundRepeat: 'repeat',
              }}
            >
              <LeafOutlineIcon className="mx-auto text-primary-600/40" size={34} />
              <p className="mt-3 text-sm text-slate-700">
                Drag and drop here, or{' '}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="font-semibold text-primary-700 hover:text-primary-800"
                >
                  choose a file
                </button>
                .
              </p>
              <p className="mt-1 text-xs text-slate-600">Supported formats: JPG, PNG</p>

              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span aria-hidden="true">📁</span> Upload from Gallery
                </button>
                <button
                  type="button"
                  onClick={openCamera}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span aria-hidden="true">📷</span> Take a Photo
                </button>
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="mt-3">
              <div className="td-fade-in relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={previewUrl} alt="Leaf preview" className="w-full h-72 object-cover" />
                {!loading && (
                  <button
                    type="button"
                    onClick={reset}
                    className="td-preview-close"
                    aria-label="Clear selected image"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onDetect}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Analyzing leaf...
                    </span>
                  ) : (
                    'Analyze leaf'
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-slate-800">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-900">Result</p>

          {!result ? (
            <div className="mt-6 text-sm text-slate-600">
              Upload a photo to begin.
            </div>
          ) : result.status === 'uncertain' ? (
            <div className="mt-4 rounded-2xl border border-accent-200 bg-accent-50 p-5">
              <div className="flex items-start gap-3">
                <Camera className="text-accent-700" size={22} />
                <div>
                  <p className="text-base font-semibold text-slate-900">Photo unclear for diagnosis</p>
                  <p className="mt-1 text-sm text-slate-800">
                    Retake the photo in natural daylight with the leaf filling most of the frame.
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-4 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <p className={`text-2xl font-semibold ${diseaseTitleClass(result.status)}`}>
                    {result.status === 'healthy' && (
                      <span className="inline-flex items-center mr-2 text-primary-700">
                        <HealthyCheckmark />
                      </span>
                    )}
                    {result.disease}
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {result.severity_stage && (
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${severityBadge(result.severity_stage)}`}>
                        {severityIcon(result.severity_stage) && (
                          <span className="mr-1 inline-flex items-center text-[16px] leading-none" aria-hidden="true">
                            {severityIcon(result.severity_stage)}
                          </span>
                        )}
                        {result.severity_stage}
                      </span>
                    )}
                    <span className="text-sm text-slate-600">{Number(result.confidence).toFixed(1)}% confidence</span>
                  </div>

                  {result.status === 'detected' && (
                    <div className="mt-4">
                      <p className="text-sm text-slate-700">
                        {result.lesion_count ?? '—'} lesions detected · {coverage === null ? '—' : `${coverage.toFixed(1)}%`} leaf area affected
                      </p>
                      <div className="mt-2 h-3 w-full rounded-full bg-gradient-to-r from-green-500 via-accent-500 to-red-600 overflow-hidden">
                        <div
                          className="h-3 bg-white/80"
                          style={{ width: `${coverage === null ? 0 : 100 - coverage}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  {result.status === 'detected' ? (
                    <div>
                      {showAffectedRegions ? (
                        <>
                          <p className="text-sm font-semibold text-slate-900">Affected regions highlighted</p>
                          <img
                            src={`data:image/jpeg;base64,${result.gradcam_image}`}
                            alt="Grad-CAM overlay"
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 object-contain"
                          />
                          <p className="mt-2 text-xs text-slate-600">Brighter areas indicate detected lesions</p>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-canvas p-4 text-sm text-slate-700">
                          No affected-region overlay available for this image.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-canvas p-4 text-sm text-slate-800">
                {result.message}
              </div>

              <button
                type="button"
                onClick={() => {
                  pushChatBootstrap();
                  navigate('/chat');
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Get Treatment Advice <MoveRight size={16} />
              </button>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Help us improve</p>
                <p className="mt-1 text-sm text-slate-700">Was this diagnosis correct?</p>

                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFeedbackChoice(true)}
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold ${
                      feedbackChoice === true
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackChoice(false)}
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold ${
                      feedbackChoice === false
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    No
                  </button>
                </div>

                {feedbackChoice !== null && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-900">Add notes (optional)</label>
                      <textarea
                        value={feedbackNotes}
                        onChange={(e) => setFeedbackNotes(e.target.value)}
                        rows={3}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        placeholder="For example: field location, weather, how the leaf looked in person..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={submitFeedback}
                      disabled={feedbackLoading}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {feedbackLoading ? <Loader2 className="animate-spin" size={16} /> : <SendHorizontal size={16} />}
                      Submit Feedback
                    </button>
                    {feedbackMessage && (
                      <div className="rounded-2xl border border-slate-200 bg-canvas px-4 py-3 text-sm text-slate-800">
                        {feedbackMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Take a Photo</p>
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <video ref={videoRef} playsInline muted className="w-full h-72 object-cover" />
            </div>

            {cameraError && (
              <div className="mt-3 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-slate-800">
                {cameraError}
              </div>
            )}

            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={closeCamera}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureFromCamera}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseDetection;
