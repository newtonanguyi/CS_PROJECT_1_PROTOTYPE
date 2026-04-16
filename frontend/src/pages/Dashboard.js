import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute -top-10 -right-10 opacity-20 pointer-events-none">
        <svg width="220" height="220" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-600">
          <path
            d="M20 4c-6 0-10 3-12 7-1.1 2.2-1.2 4.6-.6 6.8.2.7 1 .9 1.5.4l3.1-3.1c1.3-1.3 3.4-1.3 4.7 0l.4.4c.4.4 1 .4 1.4 0C20.6 11.9 21 9 21 6c0-1.1-.4-2-.9-2Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M4 20c6 0 10-3 12-7 1.1-2.2 1.2-4.6.6-6.8-.2-.7-1-.9-1.5-.4L12 8.1c-1.3 1.3-3.4 1.3-4.7 0l-.4-.4c-.4-.4-1-.4-1.4 0C3.4 12.1 3 15 3 18c0 1.1.4 2 .9 2Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="max-w-3xl">
        <h1 className="text-4xl sm:text-[48px] leading-tight font-semibold text-slate-900">
          Detect tomato Early Blight before it spreads.
        </h1>
        <p className="mt-4 text-[18px] text-slate-700">
          Upload a leaf photo. Get an instant diagnosis, severity assessment, and treatment advice — built for Ugandan
          farmers.
        </p>

        <div className="mt-6">
          <Link
            to="/disease"
            className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-6 py-3 text-white text-sm font-semibold hover:bg-primary-700"
          >
            Start Diagnosis →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Two clear outcomes</h2>
            <p className="mt-2 text-sm text-slate-700">
              The system returns Healthy, Early Blight detected, or Uncertain (retake the photo in natural daylight).
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Practical next steps</h2>
            <p className="mt-2 text-sm text-slate-700">
              Severity is based on lesion coverage so the advisory can recommend what to do now — not generic tips.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;









