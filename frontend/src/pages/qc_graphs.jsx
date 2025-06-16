import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/navbar';
import { Line } from 'react-chartjs-2';
import '../styles/qc_graphs.css'; 

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const QualityCheck = () => {
  const [originalChartData, setOriginalChartData] = useState(null);
  const [correctedChartData, setCorrectedChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState('qc-checks');
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  
  // Form state
  const [fileId, setFileId] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [solutionLabel, setSolutionLabel] = useState('QC_MES_5 ppm');
  const [availableFiles, setAvailableFiles] = useState([]);
  const [solutionLabels, setSolutionLabels] = useState([]);
  const [selectionMode, setSelectionMode] = useState('file'); // 'file' or 'date'

  // Generate different colors for multiple elements
  const generateColors = (count) => {
    const colors = [
      'rgb(34, 197, 94)',   // Green primary
      'rgb(59, 130, 246)',  // Blue
      'rgb(239, 68, 68)',   // Red
      'rgb(245, 158, 11)',  // Amber
      'rgb(139, 92, 246)',  // Purple
      'rgb(236, 72, 153)',  // Pink
      'rgb(6, 182, 212)',   // Cyan
      'rgb(132, 204, 22)',  // Lime
    ];
    
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  // Fetch available files on component mount
 useEffect(() => {
    const fetchUploadedFiles = async () => {
      try {
      
        const response = await fetch('${import.meta.env.VITE_API_URL}/uploaded-files');
        if(response.ok){
          const data = await response.json();
          if (data.success && data.files) {
            setAvailableFiles(data.files);
            if (data.files.length > 0) {
              setFileId(data.files[0].id.toString()); // Set first file as default
            }
          } else {
            console.error('Failed to fetch files:', data);
            setError('Failed to load uploaded files');
        }
        } else {
          console.error('Failed to fetch uploaded files:', response.status);
          setError('Failed to load uploaded files');
        }
      } catch (error) {
        console.error('Error fetching uploaded files:', error);
        setError('Error loading uploaded files');
      }
    };

    fetchUploadedFiles();
  }, []);

  // Fetch solution labels when file changes
  useEffect(() => {
    const fetchSolutionLabels = async () => {
      if (!fileId) return;
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/solution-labels?file_id=${fileId}`);
        if (response.ok) {
          const data = await response.json();
          setSolutionLabels(data.solutionLabels || []);
          if (data.solutionLabels && data.solutionLabels.length > 0) {
            setSolutionLabel(data.solutionLabels[0]); // Set first solution as default
          }
        }
      } catch (error) {
        console.error('Error fetching solution labels:', error);
      }
    };

    fetchSolutionLabels();
  }, [fileId, selectionMode]);

  useEffect(() => {
    const fetchAllSolutionLabels = async () => {
      if (selectionMode !== 'date' || availableFiles.length === 0) return;
      
      try {
        // Get solution labels from the first file as a reference
        // In a real application, you might want to get all unique solution labels across all files
        const response = await fetch(`${import.meta.env.VITE_API_URL}/solution-labels?file_id=${availableFiles[0].id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.solutionLabels) {
            setSolutionLabels(data.solutionLabels);
            if (data.solutionLabels.length > 0) {
              setSolutionLabel(data.solutionLabels[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching solution labels for date range:', error);
      }
    };

    fetchAllSolutionLabels();
  }, [selectionMode, availableFiles]);

  const fetchGraphData = async () => {
    if (selectionMode ==='file' && !fileId) {
      setError('Please select a file');
      return;
    }

    if(selectionMode === 'date' && (!startDate || !endDate)) {
      setError('Please select a valid date range');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {

      let url;
      if(selectionMode === 'file'){
        url = `${import.meta.env.VITE_API_URL}/graph-data?file_id=${fileId}&solution_label=${encodeURIComponent(solutionLabel)}`;
      } else {
       url = `${import.meta.env.VITE_API_URL}/graph-data-by-date?start_date=${startDate}&end_date=${endDate}&solution_label=${encodeURIComponent(solutionLabel)}`;
      }
      console.log('Fetching data from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch graph data');
      }

      // Extract timestamps from the first element's data (assuming all elements have same timestamps)
      const timestamps = data.originalGraph.data[0]?.data.map(point => {
        // Format timestamp for display
        const date = new Date(point.timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      }) || [];
      
      // Generate colors for all elements
      const colors = generateColors(data.elements.length);
      
      const originalConfig = {
        labels: timestamps,
        datasets: data.originalGraph.data.map((elementData, index) => ({
          label: elementData.element,
          data: elementData.data.map(point => point.value),
          fill: false,
          borderColor: colors[index],
          backgroundColor: colors[index] + '20', // Add transparency
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        })),
      };

      // Create chart config for corrected values
      const correctedConfig = {
        labels: timestamps,
        datasets: data.correctedGraph.data.map((elementData, index) => ({
          label: elementData.element,
          data: elementData.data.map(point => point.value),
          fill: false,
          borderColor: colors[index],
          backgroundColor: colors[index] + '20', // Add transparency
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        })),
      };

      setOriginalChartData(originalConfig);
      setCorrectedChartData(correctedConfig);
      
    } catch (error) {
      console.error('Error fetching graph data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadGraphs = () => {
    fetchGraphData();
  };

  const handleSelectionModeChange = (mode) =>{
    setSelectionMode(mode);

    setOriginalChartData(null);
    setCorrectedChartData(null);
    setError(null);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#e2e8f0',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Timestamp',
          color: '#64748b',
          font: {
            size: 12,
            weight: '500'
          }
        },
        grid: {
          color: '#f1f5f9',
          drawBorder: false,
        },
        ticks: {
          maxTicksLimit: 8,
          color: '#64748b',
          font: {
            size: 11
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Values (ppm)',
          color: '#64748b',
          font: {
            size: 12,
            weight: '500'
          }
        },
        grid: {
          color: '#f1f5f9',
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 8,
      }
    }
  };

  return (
    <div className="qc-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      <div className="qc-main-content">
        {/* Header */}
        <div className="qc-header">
          <div className="qc-breadcrumb">
            <span className="breadcrumb-item">QC Checks</span>
          </div>
          <div className="qc-header-controls">
            <button 
              className="filter-toggle-btn"
              onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"></polygon>
              </svg>
              Filters
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <p>Error: {error}</p>
          </div>
        )}

        {/* Filter Sidebar */}
        <div className={`filter-sidebar ${filterSidebarOpen ? 'open' : ''}`}>
          <div className="filter-sidebar-header">
            <h3>Filters</h3>
            <button 
              className="filter-close-btn"
              onClick={() => setFilterSidebarOpen(false)}
            >
              ×
            </button>
          </div>
          
          <div className="filter-content">
            <div className="filter-group">
              <h4>Data Selection</h4>
              <div className="radio-group">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="dateType" 
                    value="file" 
                    checked={selectionMode === 'file'}
                    onChange={(e) => setSelectionMode(e.target.value)}
                  />
                  <span>Select a file</span>
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="dateType" 
                    value="date" 
                    checked={selectionMode === 'date'}
                    onChange={(e) => setSelectionMode(e.target.value)}
                  />
                  <span>Select date range</span>
                </label>
              </div>
            </div>

            {selectionMode === 'file' ? (
              <div className="filter-group">
                <label className="filter-label">File Selection</label>
                <select 
                  value={fileId} 
                  onChange={(e) => setFileId(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select a file</option>
                  {availableFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.filename}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="filter-group">
                <label className="filter-label">Date Range</label>
                <div className="date-inputs">
                  <div className="date-input-group">
                    <label className="date-label">Start date:</label>
                    <input 
                      type="date" 
                      className="filter-date-input" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="date-input-group">
                    <label className="date-label">End date:</label>
                    <input 
                      type="date" 
                      className="filter-date-input" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="filter-group">
              <label className="filter-label">Solution Label</label>
              <select 
                value={solutionLabel} 
                onChange={(e) => setSolutionLabel(e.target.value)}
                className="filter-select"
              >
                {solutionLabels.map((label, index) => (
                  <option key={index} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleLoadGraphs}
              className="load-graphs-btn"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load Graphs'}
            </button>
          </div>
        </div>

        {/* Overlay for mobile */}
        {filterSidebarOpen && <div className="filter-overlay" onClick={() => setFilterSidebarOpen(false)}></div>}

        {/* QC Samples Section */}
        <div className="qc-section">
          <div className="qc-section-header">
            <h2>QC Samples</h2>
            <div className="sample-indicator">
              {solutionLabel}
            </div>
          </div>
          
          <div className="graphs-container-vertical">
            <div className="graph-card full-width">
              <div className="graph-header">
                <h3>Original</h3>
                <p className="graph-description">{solutionLabel} - Original Values vs Timestamp</p>
              </div>
              <div className="chart-container">
                {loading ? (
                  <div className="loading-state">Loading original data...</div>
                ) : originalChartData ? (
                  <Line 
                    data={originalChartData} 
                    options={chartOptions}
                  />
                ) : (
                  <div className="no-data">No original data available. Click "Load Graphs" to fetch data.</div>
                )}
              </div>
            </div>
            
            <div className="graph-card full-width">
              <div className="graph-header">
                <h3>Corrected</h3>
                <p className="graph-description">{solutionLabel} - Corrected Values vs Timestamp</p>
              </div>
              <div className="chart-container">
                {loading ? (
                  <div className="loading-state">Loading corrected data...</div>
                ) : correctedChartData ? (
                  <Line 
                    data={correctedChartData} 
                    options={chartOptions}
                  />
                ) : (
                  <div className="no-data">No corrected data available. Click "Load Graphs" to fetch data.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityCheck;