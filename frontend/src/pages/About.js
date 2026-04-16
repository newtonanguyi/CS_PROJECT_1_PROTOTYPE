import React from 'react';

const About = () => {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">
        Built for tomato farmers in Uganda.
      </h1>
      <p className="mt-3 text-slate-700 leading-relaxed">
        TomatoDoc is an AI-powered tomato Early Blight detection and advisory system for smallholder farmers in Uganda.
        It focuses on one problem well: confirming whether a leaf looks healthy or shows Early Blight signs, then guiding
        the next steps.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">What it detects</h2>
          <p className="mt-2 text-sm text-slate-700">
            Healthy tomato leaves and Tomato Early Blight (Alternaria solani). If the photo is unclear, the system will
            ask you to retake it instead of guessing.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">What you receive</h2>
          <p className="mt-2 text-sm text-slate-700">
            Confidence score, severity stage based on lesion coverage, and a Grad-CAM overlay that highlights affected
            regions to support farmer trust.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Field feedback</h2>
        <p className="mt-2 text-sm text-slate-700">
          After a result, you can confirm whether the diagnosis was correct and add optional notes. These submissions
          help improve accuracy on real Ugandan farm conditions.
        </p>
      </div>
    </div>
  );
};

export default About;

