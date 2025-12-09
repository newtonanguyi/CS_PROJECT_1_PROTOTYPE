import React, { useState, useEffect } from 'react';
import { advisoryAPI } from '../services/api';
import { Calendar, Sprout, CheckCircle } from 'lucide-react';

const SeasonalGuide = () => {
  const [seasonalData, setSeasonalData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  useEffect(() => {
    fetchSeasonalData();
  }, [selectedMonth]);

  const fetchSeasonalData = async () => {
    setLoading(true);
    try {
      const response = await advisoryAPI.getSeasonal(selectedMonth);
      setSeasonalData(response.data);
    } catch (error) {
      console.error('Error fetching seasonal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeasonColor = (season) => {
    const colors = {
      Spring: 'bg-green-100 text-green-800 border-green-200',
      Summer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Fall: 'bg-orange-100 text-orange-800 border-orange-200',
      Winter: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[season] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Seasonal Planting Guide</h1>
        <p className="text-gray-600 mt-1">Get recommendations for planting and crop management by season</p>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Month
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        >
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : seasonalData ? (
        <div className="space-y-6">
          {/* Season Overview */}
          <div className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getSeasonColor(seasonalData.season)}`}>
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="w-8 h-8" />
              <h2 className="text-2xl font-bold">{seasonalData.season} Season</h2>
            </div>
            <p className="text-lg">{seasonalData.recommendation}</p>
          </div>

          {/* Suitable Crops */}
          {seasonalData.suitable_crops && seasonalData.suitable_crops.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Sprout className="text-primary-600" size={20} />
                <span>Suitable Crops</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {seasonalData.suitable_crops.map((crop, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <CheckCircle className="text-green-600 flex-shrink-0" size={18} />
                    <span className="text-sm font-medium text-gray-900">{crop}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activities */}
          {seasonalData.activities && seasonalData.activities.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Activities</h3>
              <div className="space-y-2">
                {seasonalData.activities.map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                      {idx + 1}
                    </div>
                    <span className="text-gray-700">{activity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General Tips */}
          <div className="bg-gradient-to-br from-primary-50 to-green-50 rounded-xl shadow-sm border border-primary-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Seasonal Tips</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-1">•</span>
                <span>
                  Monitor weather patterns closely during this season and adjust your farming
                  practices accordingly.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-1">•</span>
                <span>
                  Prepare your soil well in advance of planting to ensure optimal growing
                  conditions.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-1">•</span>
                <span>
                  Keep track of pest and disease patterns specific to this season and take
                  preventive measures.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600 mt-1">•</span>
                <span>
                  Consult with local agricultural extension services for region-specific
                  recommendations.
                </span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No seasonal data available</p>
        </div>
      )}
    </div>
  );
};

export default SeasonalGuide;




