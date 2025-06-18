import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Autocomplete,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler);

const SJS_Graph = ({ selectedFileId }) => {
  const [elementData, setElementData] = useState({});
  const [availableElements, setAvailableElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState('');
  const [xLabel, setXLabel] = useState('Timestamp');

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/sjs-graph?file_id=${selectedFileId}`);
        const result = await response.json();

        setElementData(result.data || {});
        setAvailableElements(result.elements || []);
        setXLabel(result.xLabel || 'Timestamp');

        const defaultElement = (result.elements || [])[0] || '';
        setSelectedElement(defaultElement);
      } catch (err) {
        console.error('Error fetching SJS graph data:', err);
      }
    };

    if (selectedFileId) {
      fetchGraphData();
    }
  }, [selectedFileId]);

  const chartData = {
    labels: elementData[selectedElement]?.map((d) => d.x) || [],
    datasets: [
        // Lower bound (plotted first)
        {
          label: 'Error Lower',
          data: elementData[selectedElement]?.map(d => ({ x: d.x, y: d.lower })) || [],
          fill: false,
          borderWidth: 0,
          pointRadius: 0,
          tension: 0,
        },
        // Upper bound (fills to previous lower line)
        {
          label: 'Error Range',
          data: elementData[selectedElement]?.map(d => ({ x: d.x, y: d.upper })) || [],
          fill: '-1', // fill to previous dataset (lower)
          backgroundColor: 'rgba(173, 216, 230, 0.4)',
          borderWidth: 0,
          pointRadius: 0,
          tension: 0,
        },
        // Actual concentration
        {
          label: selectedElement,
          data: elementData[selectedElement]?.map(d => ({ x: d.x, y: d.y })) || [],
          fill: false,
          borderColor: '#00bcd4',
          backgroundColor: '#00bcd4',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        // Midline (dashed)
        {
          label: 'SJS-Std Mid',
          data: elementData[selectedElement]?.map(d => ({ x: d.x, y: d.mid })) || [],
          borderDash: [5, 5],
          borderColor: 'gray',
          backgroundColor: 'transparent',
          pointRadius: 0,
          tension: 0,
          fill: false,
        },
      ]
    
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `SJS-Std Concentration Trend - ${selectedElement}`,
        font: { size: 18 },
      },
      legend: { display: true },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: xLabel,
          font: { size: 14 },
        },
        ticks: {
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0,
          font: { size: 12 },
        },
      },
      y: {
        title: {
          display: true,
          text: 'Concentration',
          font: { size: 14 },
        },
        ticks: {
          font: { size: 12 },
        },
        beginAtZero: false,
      },
    },
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">SJS-Std Graph</Typography>
          <Autocomplete
            size="small"
            options={availableElements}
            value={selectedElement}
            onChange={(e, newValue) => setSelectedElement(newValue || '')}
            renderInput={(params) => <TextField {...params} label="Select Element" />}
            sx={{ minWidth: 250 }}
          />
        </Box>

        {selectedElement && elementData[selectedElement]?.length > 0 ? (
          <Box sx={{ width: '100%', height: 400 }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No data available for selected element.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default SJS_Graph;
