import React from 'react';

const placeholderRows = Array.from({ length: 5 }, (_, idx) => ({
  id: `RW-${String(idx + 1).padStart(3, '0')}`,
}));

const ModelPerformance = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Model Performance</h1>
        <p className="text-gray-600 mt-1">
          Core disease model evaluation metrics and current field-validation status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Test Accuracy</p>
          <p className="text-3xl font-bold text-primary-700 mt-1">84.53%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Validation Accuracy</p>
          <p className="text-3xl font-bold text-primary-700 mt-1">85.06%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Dataset Split</p>
          <p className="text-sm font-semibold text-gray-900 mt-2">
            Train: 28,882 | Val: 6,190 | Test: 6,201
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-World Sample Results</h2>
        <p className="text-sm text-gray-600 mb-4">
          Field testing template (rows are intentionally blank while validation is ongoing).
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Sample ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Crop Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Predicted Disease</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Correct? (Yes/No)</th>
              </tr>
            </thead>
            <tbody>
              {placeholderRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-500">{row.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">-</td>
                  <td className="px-4 py-3 text-sm text-gray-400">-</td>
                  <td className="px-4 py-3 text-sm text-gray-400">-</td>
                  <td className="px-4 py-3 text-sm text-gray-400">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900">
          Model trained on PlantVillage benchmark dataset. Field validation with real Ugandan farm
          samples is ongoing.
        </p>
      </div>
    </div>
  );
};

export default ModelPerformance;
