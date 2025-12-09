import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChatAdvisory from './pages/ChatAdvisory';
import Weather from './pages/Weather';
import DiseaseDetection from './pages/DiseaseDetection';
import MarketPrices from './pages/MarketPrices';
import SeasonalGuide from './pages/SeasonalGuide';
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Layout>
                  <ChatAdvisory />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/weather"
            element={
              <PrivateRoute>
                <Layout>
                  <Weather />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/disease"
            element={
              <PrivateRoute>
                <Layout>
                  <DiseaseDetection />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/market"
            element={
              <PrivateRoute>
                <Layout>
                  <MarketPrices />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/seasonal"
            element={
              <PrivateRoute>
                <Layout>
                  <SeasonalGuide />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;




