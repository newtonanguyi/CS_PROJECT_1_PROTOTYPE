import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { weatherAPI, advisoryAPI } from '../services/api';
import {
  Cloud,
  Thermometer,
  Droplets,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Calendar,
  Sprout,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [weather, setWeather] = useState(null);
  const [advisory, setAdvisory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.location) {
          const weatherData = await weatherAPI.getWeather(user.location);
          setWeather(weatherData.data);

          const advisoryData = await advisoryAPI.getComprehensive({
            location: user.location,
            crop_type: '',
          });
          setAdvisory(advisoryData.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const quickActions = [
    { icon: Cloud, label: 'Weather', path: '/weather', color: 'bg-blue-500' },
    { icon: Sprout, label: 'Disease Detection', path: '/disease', color: 'bg-red-500' },
    { icon: TrendingUp, label: 'Market Prices', path: '/market', color: 'bg-green-500' },
    { icon: Calendar, label: 'Seasonal Guide', path: '/seasonal', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user?.username || 'Farmer'}!</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Weather Snapshot */}
          {weather && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Weather Snapshot</h2>
                <Link
                  to="/weather"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                >
                  <span>View Details</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Thermometer className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Temperature</p>
                    <p className="text-2xl font-bold text-gray-900">{weather.temperature}°C</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-cyan-50 rounded-lg">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Droplets className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Humidity</p>
                    <p className="text-2xl font-bold text-gray-900">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Cloud className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Condition</p>
                    <p className="text-lg font-semibold text-gray-900">{weather.description}</p>
                  </div>
                </div>
              </div>
              {weather.advice && (
                <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <p className="text-sm text-primary-800">{weather.advice}</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.path}
                    to={action.path}
                    className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                    <div className={`p-3 ${action.color} rounded-lg mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Advisory Summary */}
          {advisory && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Crop Advisory Summary</h2>
              {advisory.comprehensive_advice ? (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-800">{advisory.comprehensive_advice}</p>
                </div>
              ) : (
                <p className="text-gray-600">No advisory available at the moment.</p>
              )}
            </div>
          )}

          {/* Seasonal Recommendations */}
          {advisory?.seasonal_recommendations && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Seasonal Recommendations</h2>
                <Link
                  to="/seasonal"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                >
                  <span>View Guide</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="font-medium text-purple-900 mb-2">
                  {advisory.seasonal_recommendations.season} Season
                </p>
                <p className="text-sm text-purple-800 mb-3">
                  {advisory.seasonal_recommendations.recommendation}
                </p>
                {advisory.seasonal_recommendations.suitable_crops && (
                  <div>
                    <p className="text-xs font-medium text-purple-700 mb-2">Suitable Crops:</p>
                    <div className="flex flex-wrap gap-2">
                      {advisory.seasonal_recommendations.suitable_crops.map((crop, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-white rounded text-xs text-purple-700 border border-purple-200"
                        >
                          {crop}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;




