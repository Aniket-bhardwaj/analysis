import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Upload,
  TrendingUp,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import Navbar from '@/components/navbar';
import { Autocomplete, TextField } from '@mui/material';
import '../styles/homepage.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend
);

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedItem, setSelectedItem] = useState('dashboard');
  const [selectedElement, setSelectedElement] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log(`Fetching dashboard data from: ${import.meta.env.VITE_API_URL}/dashboard`);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Dashboard data received:', result);
      
      if (result.success) {
        setDashboardData(result.data);
        setLastRefresh(new Date());
        setError(null);
        
        // Set default selected element if QC graph data exists
        if (result.data.qcGraphData?.success && result.data.qcGraphData.graphData) {
          const elements = Object.keys(result.data.qcGraphData.graphData);
          if (elements.length > 0 && !selectedElement) {
            setSelectedElement(elements[0]);
          }
        }
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
  const formatDate = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  
  // Format ms → "DD/MM" - Used by Chart.js
  const fmtDateOnly = (ms) => {
    const d = new Date(ms);
    return isNaN(d) ? '' : d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Build sorted labels & values arrays for Chart.js
  const { labels, values } = useMemo(() => {
    if (
      !dashboardData?.qcGraphData?.success ||
      !selectedElement ||
      !dashboardData.qcGraphData.graphData[selectedElement]
    ) {
      return { labels: [], values: [] };
    }
    const raw = dashboardData.qcGraphData.graphData[selectedElement];
    const pts = raw
      .map((r) => {
        // NOTE: Ensure the source data has a 'timestamp' property.
        // If the property is 'sample', change r.timestamp to r.sample
        const ms = new Date(r.timestamp).getTime(); 
        return { ms, value: Number(r.value) };
      })
      .filter((p) => !isNaN(p.ms) && !isNaN(p.value))
      .sort((a, b) => a.ms - b.ms);

    return {
      labels: pts.map((p) => fmtDateOnly(p.ms)),
      values: pts.map((p) => p.value)
    };
  }, [dashboardData, selectedElement]);

  // Chart.js dataset
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: selectedElement,
        data: values,
        borderColor: '#2563eb',
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 15
      }
    ]
  }), [labels, values, selectedElement]);

  // Chart.js options
  const chartOptions = useMemo(() => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variation = (max - min) || max * 0.1 || 1; // Add fallback for empty data
    const yMin = min - variation;
    const yMax = max + variation;

    let lastTick = null;
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'category',
          grid: { display: false },
          ticks: {
            autoSkip: false,
            callback: (val, idx) => {
              const lbl = labels[idx];
              if (lbl !== lastTick) {
                lastTick = lbl;
                return lbl;
              }
              return '';
            }
          }
        },
        y: {
          min: yMin,
          max: yMax,
          title: { display: true, text: 'Concentration' },
          ticks: { precision: 2 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Date: ${items[0].label}`,
            label: (ctx) => `${selectedElement}: ${ctx.parsed.y.toFixed(2)}`
          }
        }
      }
    };
  }, [labels, values, selectedElement]);

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

  const availableElements = dashboardData?.qcGraphData?.success ?
    Object.keys(dashboardData.qcGraphData.graphData || {}) : [];

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
                <CheckCircle className={`icon-qc ${(dashboardData?.qcPassRate || 0) >= 80 ? 'icon-qc-good' : 'icon-qc-bad'}`} />
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

        <div className="charts-container">
          {/* QC Graph Chart */}
          <div className="chart-card chart-main">
            <div className="chart-header">
              <h3 className="chart-title">QC Element Trends (Past Week)</h3>
              {availableElements.length > 0 && (
                <div className="element-selector">
                  <Autocomplete
                    disablePortal
                    id="element-search"
                    options={availableElements}
                    sx={{ width: 300 }}
                    value={selectedElement}
                    onChange={(_, newValue) => setSelectedElement(newValue)}
                    renderInput={(params) => <TextField {...params} label="Select Element" variant="outlined" />}
                    size="small"
                  />
                </div>
              )}
            </div>
            
            <div style={{ position: 'relative', height: '350px' }}>
              {values.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="no-data">
                  <div className="no-data-content">
                    <TrendingUp className="no-data-icon" />
                    <p>No QC data available for the selected element</p>
                    {availableElements.length === 0 && (
                      <p className="no-data-subtitle">No elements found in QC data</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QC Statistics */}
        {dashboardData?.qcGraphData?.success && (
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Elements</h4>
              <p className="stat-value">{dashboardData.qcGraphData.summary?.totalElements || 0}</p>
            </div>
            <div className="stat-card">
              <h4>QC Files</h4>
              <p className="stat-value">{dashboardData.qcGraphData.summary?.totalFiles || 0}</p>
            </div>
            <div className="stat-card">
              <h4>Data Points</h4>
              <p className="stat-value">{dashboardData.qcGraphData.summary?.totalDataPoints || 0}</p>
            </div>
            {selectedElement && dashboardData.qcGraphData.graphData[selectedElement] && (
              <div className="stat-card">
                <h4>{selectedElement} Points</h4>
                <p className="stat-value">
                  {dashboardData.qcGraphData.graphData[selectedElement]?.length || 0}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="dashboard-footer">
          {error && (
            <p className="footer-error">
              Warning: {error}
            </p>
          )}
          {dashboardData?.qcGraphData?.success && (
            <p className="footer-info">
              QC data from {dashboardData.qcGraphData.summary?.dateRange?.start ? 
                formatDate(dashboardData.qcGraphData.summary.dateRange.start) : 'N/A'} to {
                dashboardData.qcGraphData.summary?.dateRange?.end ? 
                formatDate(dashboardData.qcGraphData.summary.dateRange.end) : 'N/A'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;