import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckSquare, Loader2, MessageSquare, Square, XCircle } from 'lucide-react';
import { fieldSamplesAPI } from '../services/api';

const clamp01 = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
};

const pct = (v) => `${(clamp01(v) * 100).toFixed(1)}%`;

const confidenceColors = (confidence) => {
  const c = clamp01(confidence);
  if (c > 0.75) return { bar: 'bg-green-600', track: 'bg-green-100', text: 'text-green-700' };
  if (c >= 0.5) return { bar: 'bg-amber-500', track: 'bg-amber-100', text: 'text-amber-700' };
  return { bar: 'bg-red-600', track: 'bg-red-100', text: 'text-red-700' };
};

const severityBadgeClass = (stage) => {
  const s = String(stage || '').toLowerCase();
  if (s === 'early') return 'bg-green-100 text-green-800 border-green-300';
  if (s === 'mid') return 'bg-amber-100 text-amber-900 border-amber-400';
  return 'bg-red-100 text-red-900 border-red-300';
};

const severityIcon = (stage) => {
  const s = String(stage || '').toLowerCase();
  if (s === 'early') return '🌱';
  if (s === 'mid') return '⚠️';
  if (s === 'late') return '🔴';
  return '';
};

const SmallBar = ({ value }) => {
  const c = clamp01(value);
  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-2 bg-gray-500" style={{ width: `${c * 100}%` }} />
      </div>
    </div>
  );
};

const DiagnosisReportCard = ({ imageUrl, imageFile, diagnosis, userLocation }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('what');
  const [checked, setChecked] = useState({});
  const [userConfirmed, setUserConfirmed] = useState(null);
  const [farmerNotes, setFarmerNotes] = useState('');
  const [sampleSubmitting, setSampleSubmitting] = useState(false);
  const [sampleMessage, setSampleMessage] = useState('');

  const primary = diagnosis?.primary_diagnosis;
  const alternatives = diagnosis?.alternative_diagnoses || [];
  const report = diagnosis?.report;
  const severityStage = primary?.severity_stage || diagnosis?.severity_stage;
  const isHealthy = useMemo(() => {
    const key = String(primary?.disease_key || primary?.disease || '').toLowerCase();
    return key.includes('healthy');
  }, [primary?.disease, primary?.disease_key]);

  const colors = useMemo(() => confidenceColors(primary?.confidence), [primary?.confidence]);

  const pushAdvisoryBootstrap = () => {
    if (!primary) return;
    const p = clamp01(primary.confidence) * 100;
    const ctx = `The farmer's tomato leaf has been diagnosed with ${primary.disease} at ${severityStage} severity. Confidence: ${p.toFixed(1)}%. Please provide specific treatment recommendations.`;
    sessionStorage.setItem(
      'tomato_advisory_bootstrap',
      JSON.stringify({
        message: ctx,
        detection_context: ctx,
        disease_name: primary.disease,
        from_detection: true,
        confidence: primary.confidence,
        severity_stage: severityStage,
        autoSend: true,
      }),
    );
  };

  const onAskAdvisor = () => {
    pushAdvisoryBootstrap();
    navigate('/chat');
  };

  const submitFieldSample = async (e) => {
    e.preventDefault();
    if (userConfirmed === null || !imageFile) {
      setSampleMessage('Please choose Yes or No, and ensure the leaf image is still available.');
      return;
    }
    setSampleSubmitting(true);
    setSampleMessage('');
    try {
      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('predicted_disease', primary.disease);
      fd.append('severity_stage', String(severityStage || ''));
      fd.append('confidence', String(primary.confidence ?? 0));
      fd.append('user_confirmed', userConfirmed ? 'true' : 'false');
      fd.append('farmer_notes', farmerNotes);
      if (userLocation) fd.append('location', userLocation);
      await fieldSamplesAPI.create(fd);
      setSampleMessage('Thank you — your feedback was saved.');
      setFarmerNotes('');
    } catch {
      setSampleMessage('Could not save feedback. Please try again later.');
    } finally {
      setSampleSubmitting(false);
    }
  };

  if (!primary || !report || diagnosis?.status !== 'ok') return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="sm:w-40 w-full">
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              {imageUrl ? (
                <img src={imageUrl} alt="Leaf" className="w-full h-40 sm:h-40 object-cover" />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-gray-400 text-sm">
                  No image
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{primary.disease}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Confidence: <span className={`font-semibold ${colors.text}`}>{pct(primary.confidence)}</span>
                </p>
                {severityStage && (
                  <p className="text-sm mt-2">
                    <span className="text-gray-600">Severity stage: </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-semibold ${severityBadgeClass(
                        severityStage,
                      )}`}
                    >
                      {severityIcon(severityStage) && (
                        <span className="mr-1 inline-flex items-center text-[16px] leading-none" aria-hidden="true">
                          {severityIcon(severityStage)}
                        </span>
                      )}
                      {severityStage}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">(score-based estimate)</span>
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1">
                {primary.disease_key}
              </span>
            </div>

            <div className="mt-3">
              <div className={`h-3 rounded-full ${colors.track} overflow-hidden`}>
                <div className={`h-3 ${colors.bar}`} style={{ width: `${clamp01(primary.confidence) * 100}%` }} />
              </div>
            </div>

            {diagnosis?.confidence_warning && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-semibold">Low confidence result — please consult an agricultural officer</p>
                    <p className="text-sm mt-1">
                      Consult an agricultural officer or NAADS extension worker before taking action.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {diagnosis?.internal_warning && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800">
                <p className="text-sm">
                  <span className="font-semibold">Note:</span> {diagnosis.internal_warning}
                </p>
              </div>
            )}

            {diagnosis?.agronomist_note && (
              <p className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {diagnosis.agronomist_note}
              </p>
            )}
          </div>
        </div>

        {diagnosis?.heatmap_base64 && !isHealthy && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Model explainability</p>
            <img
              src={`data:image/jpeg;base64,${diagnosis.heatmap_base64}`}
              alt="Grad-CAM attention overlay"
              className="w-full max-h-80 object-contain rounded-lg border border-gray-200 bg-white"
            />
            <p className="text-sm text-gray-600 mt-2">
              Model attention map — highlighted region indicates detected lesion area.
            </p>
          </div>
        )}

        <div className="mt-6">
          <h4 className="text-base font-semibold text-gray-900">Other possibilities considered</h4>
          <p className="text-sm text-gray-600 mt-1">
            The model evaluated tomato classes; lower scores were ruled less likely.
          </p>
          <div className="mt-3 space-y-3">
            {alternatives.slice(0, 2).map((alt) => (
              <div key={alt.disease_key} className="p-4 rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">{alt.disease}</p>
                  <p className="text-sm text-gray-600">{pct(alt.confidence)}</p>
                </div>
                <div className="mt-2">
                  <SmallBar value={alt.confidence} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('what')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                tab === 'what'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              What Is This?
            </button>
            <button
              type="button"
              onClick={() => setTab('do')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                tab === 'do'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              What To Do
            </button>
            <button
              type="button"
              onClick={() => setTab('ug')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                tab === 'ug'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Uganda Context
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            {tab === 'what' && (
              <div className="space-y-3">
                <p className="text-gray-900 leading-relaxed">{report.what_it_is}</p>
                <p className="text-gray-700 italic">{report.why_it_matters}</p>
              </div>
            )}

            {tab === 'do' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Immediate actions</h5>
                  <ol className="space-y-3">
                    {(report.immediate_actions || []).map((action, idx) => {
                      const key = `a_${idx}`;
                      const isOn = !!checked[key];
                      return (
                        <li key={key} className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => setChecked((p) => ({ ...p, [key]: !p[key] }))}
                            className="mt-0.5 text-primary-700"
                            aria-label={isOn ? 'Mark unchecked' : 'Mark checked'}
                          >
                            {isOn ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                          <span className="text-sm text-gray-800 leading-relaxed">{action}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div className="bg-white border border-red-200 rounded-xl p-4">
                  <h5 className="font-semibold text-red-900 mb-3">What not to do</h5>
                  <ul className="space-y-3">
                    {(report.what_not_to_do || []).map((mistake, idx) => (
                      <li key={`n_${idx}`} className="flex items-start gap-3">
                        <XCircle className="mt-0.5 text-red-600 flex-shrink-0" size={20} />
                        <span className="text-sm text-red-900 leading-relaxed">{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === 'ug' && (
              <div className="space-y-3">
                <p className="text-gray-900 leading-relaxed">{report.uganda_specific_note}</p>
                <div className="mt-2 text-sm text-gray-700">
                  <p>For free expert advice, contact your nearest NAADS agricultural officer.</p>
                  <p className="font-semibold">NAADS Hotline: 0800 100 006</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {imageFile && (
          <form onSubmit={submitFieldSample} className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-4">
            <h4 className="text-sm font-semibold text-gray-900">Help improve this system — confirm this diagnosis</h4>
            <p className="text-xs text-gray-600 mt-1">
              Optional. Saves this image and labels for Uganda field validation (reviewable in Django admin).
            </p>
            <div className="mt-3 flex flex-wrap gap-4 items-center">
              <span className="text-sm text-gray-700">Was this diagnosis correct?</span>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="confirm"
                  checked={userConfirmed === true}
                  onChange={() => setUserConfirmed(true)}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="confirm"
                  checked={userConfirmed === false}
                  onChange={() => setUserConfirmed(false)}
                />
                No
              </label>
            </div>
            <textarea
              value={farmerNotes}
              onChange={(e) => setFarmerNotes(e.target.value)}
              placeholder="Optional notes (symptoms, field conditions…)"
              rows={2}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={sampleSubmitting}
              className="mt-3 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {sampleSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit feedback
            </button>
            {sampleMessage && <p className="mt-2 text-sm text-gray-700">{sampleMessage}</p>}
          </form>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-5 sm:p-6">
        <button
          type="button"
          onClick={onAskAdvisor}
          className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition flex items-center justify-center gap-2"
        >
          <MessageSquare size={20} />
          <span>Open advisory chat with this diagnosis</span>
        </button>
      </div>
    </div>
  );
};

export default DiagnosisReportCard;
