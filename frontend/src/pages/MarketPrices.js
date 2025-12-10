import React, { useState, useEffect } from 'react';
import { marketAPI } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';

const MarketPrices = () => {
  const [prices, setPrices] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('Tomato');
  const [history, setHistory] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const crops = ['Tomato', 'Maize', 'Potato', 'Onion', 'Rice', 'Wheat'];

  useEffect(() => {
    fetchPrices();
  }, []);

  useEffect(() => {
    if (selectedCrop) {
      fetchHistory();
      fetchPrediction();
    }
  }, [selectedCrop]);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const response = await marketAPI.getPrices();
      setPrices(response.data);
      if (response.data.crops) {
        setSelectedCrop(Object.keys(response.data.crops)[0]);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await marketAPI.getHistory(selectedCrop, 30);
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchPrediction = async () => {
    try {
      const response = await marketAPI.predictPrice(selectedCrop);
      setPrediction(response.data);
    } catch (error) {
      console.error('Error fetching prediction:', error);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="text-green-600" size={20} />;
    if (trend === 'down') return <TrendingDown className="text-red-600" size={20} />;
    return <Minus className="text-gray-600" size={20} />;
  };

  const chartData = history?.history?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: item.price,
  })) || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Market Prices</h1>
        <p className="text-gray-600 mt-1">Track crop prices and predictions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Crop Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Crop</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {crops.map((crop) => (
                <button
                  key={crop}
                  onClick={() => setSelectedCrop(crop)}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedCrop === crop
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {crop}
                </button>
              ))}
            </div>
          </div>

          {/* Current Prices */}
          {prices?.crops && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(prices.crops).map(([crop, data]) => (
                <div
                  key={crop}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{crop}</h3>
                    {getTrendIcon(data.trend)}
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <DollarSign className="text-gray-400" size={20} />
                    <span className="text-2xl font-bold text-gray-900">{data.current_price}</span>
                    <span className="text-sm text-gray-500">/{data.unit}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 capitalize">Trend: {data.trend}</p>
                </div>
              ))}
            </div>
          )}

          {/* Price History Chart */}
          {history && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Price History - {selectedCrop}
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Price</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${history.current_price?.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Price Prediction */}
          {prediction && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                7-Day Price Prediction - {selectedCrop}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Current Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${prediction.current_price?.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Average Predicted</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${prediction.average_predicted?.toFixed(2)}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    {getTrendIcon(prediction.trend)}
                    <span className="text-sm text-gray-600 capitalize">{prediction.trend}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Daily Predictions</h3>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                  {prediction.predictions?.map((pred, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-xs text-gray-600 mb-1">
                        {new Date(pred.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        ${pred.predicted_price?.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {prediction.note && (
                <p className="text-xs text-gray-500 mt-4 italic">{prediction.note}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketPrices;







