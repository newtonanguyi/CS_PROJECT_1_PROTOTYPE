import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { advisoryAPI } from '../services/api';
import {
  AlertCircle,
  ArrowRight,
  Sprout,
  MessageSquare,
  ScanLine,
  BarChart3,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [advisory, setAdvisory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.location) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {user?.username || 'Farmer'}! Start with disease diagnosis, then ask the advisor for guidance.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Hero Actions (Primary Focus) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Start Here</h2>
                <p className="text-gray-600 mt-1">
                  Diagnose leaf disease with the AI model, then ask the advisor for next steps.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/disease"
                className="group rounded-xl border border-red-200 bg-red-50 p-6 hover:bg-red-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-red-600">
                      <ScanLine className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">Diagnose Your Crop</p>
                      <p className="text-sm text-gray-700">
                        Upload a leaf image for disease detection (hero feature).
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="text-red-700 group-hover:translate-x-1 transition" size={18} />
                </div>
              </Link>

              <Link
                to="/chat"
                className="group rounded-xl border border-primary-200 bg-primary-50 p-6 hover:bg-primary-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary-600">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">Ask the Advisor</p>
                      <p className="text-sm text-gray-700">
                        Chat for guidance, best practices, and treatment suggestions.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="text-primary-700 group-hover:translate-x-1 transition" size={18} />
                </div>
              </Link>
            </div>

            <div className="mt-4">
              <Link
                to="/model-performance"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 inline-flex items-center gap-2"
              >
                <BarChart3 size={16} />
                View model performance and field-testing template
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Advisor Summary</h2>
            <p className="text-sm text-gray-600 mb-4">
              This summary combines seasonal context and best practices (supporting information for disease diagnosis).
            </p>
            {advisory?.comprehensive_advice ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-800">{advisory.comprehensive_advice}</p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  No advisory available yet. You can still use Disease Detection and the Advisory Chat.
                </p>
              </div>
            )}
          </div>

          {/* Coming Soon (Demoted Features) */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-800">Coming Soon</h2>
            <p className="text-sm text-gray-600 mt-1">
              These features are planned for a future phase. The current scope prioritizes disease detection and advisory chat.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 opacity-70">
                <p className="font-medium text-gray-800">Weather Insights</p>
                <p className="text-sm text-gray-600 mt-1">
                  Forecast-based advice (supplementary feature).
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 opacity-70">
                <p className="font-medium text-gray-800">Market Trends</p>
                <p className="text-sm text-gray-600 mt-1">
                  Reference prices and baseline prediction (supplementary feature).
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Link to="/more-features" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-2">
                <Sprout size={16} />
                View supplementary modules
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;









