import React, { useState, useEffect } from 'react';
import { apiFetch } from '../csrfClient';
import { TrendingUp, Database, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import Navbar from '@/components/navbar';
import QCGraph from '@/components/qc_graph';
import '../styles/homepage.css';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedItem, setSelectedItem] = useState('Dashboard'); // Corrected the selected item state

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    // Ensure user data exists before proceeding
    const userSession = sessionStorage.getItem('user');
    if (!userSession) {
      setError('User not logged in.');
      setLoading(false);
      return;
    }
    const userData = JSON.parse(userSession).user;

    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_API_URL}/dashboard`;
      const response = await apiFetch(apiUrl, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = response.data;
      setDashboardData(result);
      setLastRefresh(new Date());
      setError(null);
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

  // Compute last week's range
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  const dateRange = {
    startDate: lastWeek.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
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
          <button onClick={fetchDashboardData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

      <div className="dashboard-content">
        {/* Step 2: Update the Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-info">
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="last-updated">
                {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
              </p>
            </div>
            {/* The new header component is placed here */}
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
                <p className="card-value">{dashboardData?.totalFiles || 0}</p>
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
                <p className="card-value">{dashboardData?.totalSamples || 0}</p>
              </div>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <CheckCircle
                  className={`icon-qc ${(dashboardData?.qcPassRate || 0) >= 80 ? 'icon-qc-good' : 'icon-qc-bad'}`}
                />
              </div>
              <div className="card-info">
                <h3 className="card-label">QC Pass Rate</h3>
                <p className="card-value">{dashboardData?.qcPassRate || 0}%</p>
                <p className="card-subtitle">past week</p>
              </div>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <TrendingUp className="icon-trending" />
              </div>
              <div className="card-info">
                <h3 className="card-label">QC Checks</h3>
                <p className="card-value">{dashboardData?.qcStats?.totalChecks || 0}</p>
                <p className="card-subtitle">{dashboardData?.qcStats?.passedChecks || 0} passed</p>
              </div>
            </div>
          </div>
        </div>

        {/* QC Graphs */}
        <div className="charts-container">
          <div className="chart-card chart-main">
            <QCGraph
              selectedFileId={undefined}
              selectedDateRange={dateRange}
              title="QC Element Trends (Past Week)"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="dashboard-footer">
          {error && <p className="footer-error">Warning: {error}</p>}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
