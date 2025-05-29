import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/navbar';
import { Line } from 'react-chartjs-2';
import '../styles/quality_check.css'; 

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

import {
  Box,
  Typography,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Button,
} from '@mui/material';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileId, setFileId] = useState(null); // Add fileId state

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

  useEffect(() => {
    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('http://localhost:5000/graph-data');
        
        if (!response.ok) {
          throw new Error(`HTTP error!, status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch graph data');
        }

        // Extract timestamps from the first element's data (assuming all elements have same timestamps)
        const timestamps = data.originalGraph.data[0]?.data.map(point => point.timestamp) || [];
        
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

    if (fileId) {
      fetchGraphData();
    }
  }, [fileId]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend to match design
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

  if (loading) {
    return (
      <div className="qc-container">
        <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
        <div className="qc-main-content">
          <div className="loading-state">
            <p>Loading graphs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qc-container">
        <Navbar />
        <div className="qc-main-content">
          <div className="error-state">
            <p>Error loading graphs: {error}</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="date-selector">
              <label>
                <input type="radio" name="dateType" value="file" />
                Select a file
              </label>
              <label>
                <input type="radio" name="dateType" value="start" defaultChecked />
                Select a start date
              </label>
              <input type="date" className="date-input" defaultValue="2024-01-01" />
              <label>
                Select end date
              </label>
              <input type="date" className="date-input" defaultValue="2024-12-31" />
            </div>
          </div>
        </div>

        {/* QC Samples Section */}
        <div className="qc-section">
          <div className="qc-section-header">
            <h2>QC Samples</h2>
            <div className="sample-indicator">Ca (1111.9...)</div>
          </div>
          
          <div className="graphs-container">
            <div className="graph-card">
              <div className="graph-header">
                <h3>Original</h3>
                <p className="graph-description">QC_MES_5 ppm - Original Values vs Timestamp</p>
              </div>
              <div className="chart-container">
                {originalChartData ? (
                  <Line 
                    data={originalChartData} 
                    options={chartOptions}
                  />
                ) : (
                  <div className="no-data">No original data available</div>
                )}
              </div>
            </div>
            
            <div className="graph-card">
              <div className="graph-header">
                <h3>Corrected</h3>
                <p className="graph-description">QC_MES_5 ppm - Corrected Values vs Timestamp</p>
              </div>
              <div className="chart-container">
                {correctedChartData ? (
                  <Line 
                    data={correctedChartData} 
                    options={chartOptions}
                  />
                ) : (
                  <div className="no-data">No corrected data available</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SJS Samples Section */}
        <div className="qc-section">
          <div className="qc-section-header">
            <h2>SJS Samples</h2>
          </div>
          
          <div className="graphs-container">
            <div className="graph-card">
              <div className="graph-header">
                <h3>Original</h3>
                <p className="graph-description">Graph name/description</p>
              </div>
              <div className="chart-container">
                {originalChartData ? (
                  <Line 
                    data={originalChartData} 
                    options={chartOptions}
                  />
                ) : (
                  <div className="no-data">No original data available</div>
                )}
              </div>
            </div>
            
            <div className="graph-card">
              <div className="graph-header">
                <h3>Corrected</h3>
                <p className="graph-description">Graph name/description</p>
              </div>
              <div className="chart-container">
                {correctedChartData ? (
                  <Line 
                    data={correctedChartData} 
                    options={chartOptions}
                  />
                ) : (
                  <div className="no-data">No corrected data available</div>
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