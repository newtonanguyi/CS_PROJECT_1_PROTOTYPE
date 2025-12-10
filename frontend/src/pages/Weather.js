import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { weatherAPI } from '../services/api';
import { Cloud, Thermometer, Droplets, Wind, AlertCircle, Search } from 'lucide-react';

const Weather = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState(user?.location || '');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.location) {
      fetchWeather(user.location);
    }
  }, [user]);

  const fetchWeather = async (loc) => {
    if (!loc.trim()) {
      setError('Please enter a location');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await weatherAPI.getWeather(loc);
      setWeather(response.data);
    } catch (err) {
      setError('Failed to fetch weather data. Please try again.');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWeather(location);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Weather Intelligence</h1>
        <p className="text-gray-600 mt-1">Get real-time weather forecasts and agricultural advice</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location (e.g., Nairobi, Kenya)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
          >
            <Search size={20} />
            <span>Search</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center space-x-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : weather ? (
        <div className="space-y-6">
          {/* Main Weather Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{weather.location}</h2>
                <p className="text-blue-100">{weather.description}</p>
              </div>
              <Cloud size={64} className="text-blue-200" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-blue-200 text-sm mb-1">Temperature</p>
                <p className="text-3xl font-bold">{weather.temperature}°C</p>
              </div>
              <div>
                <p className="text-blue-200 text-sm mb-1">Humidity</p>
                <p className="text-3xl font-bold">{weather.humidity}%</p>
              </div>
              <div>
                <p className="text-blue-200 text-sm mb-1">Wind Speed</p>
                <p className="text-3xl font-bold">{weather.wind_speed || 'N/A'} m/s</p>
              </div>
              <div>
                <p className="text-blue-200 text-sm mb-1">Rain Prediction</p>
                <p className="text-lg font-semibold">{weather.rain_prediction}</p>
              </div>
            </div>
          </div>

          {/* Agricultural Advice */}
          {weather.advice && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <AlertCircle className="text-primary-600" size={20} />
                <span>Agricultural Advice</span>
              </h3>
              <p className="text-gray-700">{weather.advice}</p>
            </div>
          )}

          {/* Forecast */}
          {weather.forecast?.tomorrow && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tomorrow's Forecast</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Thermometer className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Temperature</p>
                  <p className="text-xl font-bold text-gray-900">
                    {weather.forecast.tomorrow.temperature}°C
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Droplets className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Humidity</p>
                  <p className="text-xl font-bold text-gray-900">
                    {weather.forecast.tomorrow.humidity}%
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Cloud className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Rain Chance</p>
                  <p className="text-xl font-bold text-gray-900">
                    {weather.forecast.tomorrow.rain_chance}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Cloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Enter a location to view weather information</p>
          </div>
        )
      )}
    </div>
  );
};

export default Weather;







