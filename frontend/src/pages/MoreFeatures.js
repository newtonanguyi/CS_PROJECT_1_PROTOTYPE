import React from 'react';
import { Link } from 'react-router-dom';

const MoreFeatures = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">More Features</h1>
        <p className="text-gray-600 mt-1">
          These modules are functional in the codebase, but are deprioritized in the current project
          scope.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Coming Soon</h2>
        <p className="text-sm text-gray-600 mt-1">
          Weather insights and market trends will be promoted in a future deployment phase after
          extended field validation.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="font-medium text-gray-900">Weather Insights</p>
            <p className="text-sm text-gray-600 mt-1">
              Provider-backed weather forecasts with agricultural advice.
            </p>
            <Link to="/weather" className="text-sm text-primary-700 hover:text-primary-800 mt-3 inline-block">
              Open module (supplementary)
            </Link>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="font-medium text-gray-900">Market Trends</p>
            <p className="text-sm text-gray-600 mt-1">
              Regional reference market prices with a baseline forecast.
            </p>
            <Link to="/market" className="text-sm text-primary-700 hover:text-primary-800 mt-3 inline-block">
              Open module (supplementary)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoreFeatures;

