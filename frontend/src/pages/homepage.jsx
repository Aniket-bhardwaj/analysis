import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Upload, TrendingUp, Database, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import Navbar from '@/components/navbar';
import '../styles/homepage.css';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedItem, setSelectedItem] = useState('dashboard');


  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Fetching dashboard data from: http://localhost:5000/dashboard');
      
      const response = await fetch('http://localhost:5000/dashboard');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Dashboard data received:', result);
      
      if (result.success) {
        setDashboardData(result.data);
        setLastRefresh(new Date());
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2 className="error-title">Error Loading Dashboard</h2>
          <p className="error-message">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, recentFiles, qcChart, qcStatistics } = dashboardData || {};

  return (
    <div className="dashboard-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      
      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-info">
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="last-updated">
                {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <FileText className="icon-files" />
              </div>
              <div className="card-info">
                <h3 className="card-label">Total Files</h3>
                <p className="card-value">{summary?.totalFiles || 0}</p>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <Database className="icon-database" />
              </div>
              <div className="card-info">
                <h3 className="card-label">Total Samples</h3>
                <p className="card-value">{summary?.totalSamples || 0}</p>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <TrendingUp className="icon-trending" />
              </div>
              <div className="card-info">
                <h3 className="card-label">This Week</h3>
                <p className="card-value">{summary?.weeklyFiles || 0}</p>
                <p className="card-subtitle">files uploaded</p>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <CheckCircle className={`icon-qc ${(summary?.qcPassRate || 0) >= 80 ? 'icon-qc-good' : 'icon-qc-bad'}`} />
              </div>
              <div className="card-info">
                <h3 className="card-label">QC Pass Rate</h3>
                <p className="card-value">{summary?.qcPassRate || 0}%</p>
                <p className="card-subtitle">past week</p>
              </div>
            </div>
          </div>
        </div>

        <div className="charts-container">
          {/* QC Trend Chart */}
          <div className="chart-card chart-main">
            <h3 className="chart-title">QC Pass Rate Trend (Past Week)</h3>
            {qcChart?.dailySummaries?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={qcChart.dailySummaries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Pass Rate (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, 'Pass Rate']}
                    labelFormatter={(label) => `Date: ${formatDate(label)}`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="averagePassRate" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">
                <div className="no-data-content">
                  <TrendingUp className="no-data-icon" />
                  <p>No QC data available for the past week</p>
                </div>
              </div>
            )}
          </div>

          {/* QC Statistics */}
          <div className="charts-files-row"> 
          <div className="chart-card chart-sidebar">
            <h3 className="chart-title">QC Statistics</h3>
            <div className="stats-container">
              <div className="stat-row">
                <span className="stat-label">Total QC Runs</span>
                <span className="stat-value">{qcStatistics?.totalQCRuns || 0}</span>
              </div>
              
              <div className="stat-row">
                <span className="stat-label">Average RSD</span>
                <span className="stat-value">{qcStatistics?.averageRSD || 0}%</span>
              </div>
              
              <div className="stat-row">
                <span className="stat-label">Average Error</span>
                <span className="stat-value">{qcStatistics?.averageError || 0}%</span>
              </div>
              
              
            </div>
          </div>
          </div>
        </div>


        {qcChart?.dailySummaries?.length > 0 && (
          <div className="chart-card chart-full">
            <h3 className="chart-title">Daily QC Runs</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={qcChart.dailySummaries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'ppmRuns' ? 'PPM Runs' : 'PPB Runs']}
                  labelFormatter={(label) => `Date: ${formatDate(label)}`}
                />
                <Legend />
                <Bar dataKey="ppmRuns" stackId="a" fill="#3b82f6" name="PPM Files" />
                <Bar dataKey="ppbRuns" stackId="a" fill="#10b981" name="PPB Files" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        

        {/* Footer */}
        <div className="dashboard-footer">
          {error && (
            <p className="footer-error">
              Warning: {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;