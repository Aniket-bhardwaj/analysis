import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Autocomplete,
  Alert,
  CircularProgress,
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

// Register Chart.js components
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler);

// 🔧 helper to format date as YYYY-MM-DD
const formatDate = (dateObj) =>
  `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

const SJS_Graph = ({ selectedFileId, selectedDateRange }) => {
  const [elementData, setElementData] = useState({});
  const [availableElements, setAvailableElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState('');
  const [xLabel, setXLabel] = useState('Timestamp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Builds the API URL based on selected file or date range
  const buildUrl = () => {
    const baseUrl = `${import.meta.env.VITE_API_URL}/sjs-graph`;
    const params = new URLSearchParams();

    if (selectedDateRange?.startDate && selectedDateRange?.endDate) {
      const start = formatDate(new Date(selectedDateRange.startDate));
      const end = formatDate(new Date(selectedDateRange.endDate));
      params.append('start_date', start);
      params.append('end_date', end);
    } else if (selectedFileId) {
      params.append('file_id', selectedFileId);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  // Effect to fetch data when file ID or date range changes
  useEffect(() => {
    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = buildUrl();
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        setElementData(result.data || {});
        setAvailableElements(result.elements || []);
        setXLabel(result.xLabel || 'Timestamp');

        const defaultElement = (result.elements || [])[0] || '';
        setSelectedElement(defaultElement);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching SJS graph data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedFileId || (selectedDateRange?.startDate && selectedDateRange?.endDate)) {
      fetchGraphData();
    }
  }, [selectedFileId, selectedDateRange]);

  // Prepares the data and configuration for the chart
  const getChartData = () => {
    const datasets = [];
    const currentElementData = elementData[selectedElement] || [];

    if (currentElementData.length > 0) {

       // Actual concentration data line
      datasets.push({
        label: selectedElement,
        data: currentElementData.map(d => d.y || d.value),
        pointBackgroundColor: currentElementData.map(d => {
          const mid = (d.upper + d.lower) / 2;
          const lower10 = mid * 0.9;
          const upper10 = mid * 1.1;
          return d.y < lower10 || d.y > upper10 ? '#f44336' : '#4caf50'; // red = outside, green = inside 10%
        }),
        pointBorderColor: 'transparent',
        pointRadius: 5,
        pointHoverRadius: 6,
        showLine : false,
        
      });
      // Add the new envelope (10% up/down) first to render it in the background
      datasets.push({
        label: '10% Error Envelope (against median)',
        data: currentElementData.map(d => {
          const mid = (d.upper + d.lower) / 2;
          return { x: d.x, y: mid * 1.1 }; // 5% up
        }),
        fill: false,
        backgroundColor: 'rgba(173, 230, 189, 0.2)', // Light orange fill
        borderWidth: 0,
        pointRadius: 0,
        tension: 0,
      });
      datasets.push({
        label: '10% Error Envelope (against median)', // Matching label to group in legend
        data: currentElementData.map(d => {
          const mid = (d.upper + d.lower) / 2;
          return { x: d.x, y: mid * 0.9 }; // 5% down
        }),
        fill: '-1', // Fill to the previous dataset
        backgroundColor: 'rgba(173, 230, 189, 0.2)',
        borderWidth: 0,
        pointRadius: 0,
        tension: 0,
      });

      // Original Lower bound
      datasets.push({
        label: 'Target Standard Value',
        data: currentElementData.map(d => ({ x: d.x, y: d.lower })),
        fill: false,
        backgroundColor: 'rgba(173, 230, 189, 0.6)',
        borderWidth: 0,
        pointRadius: 0,
        tension: 0,
      });
      // Original Upper bound
      datasets.push({
        label: 'Target Standard Value',
        data: currentElementData.map(d => ({ x: d.x, y: d.upper })),
        fill: '-1', // fill to previous dataset (lower)
        backgroundColor: 'rgba(173, 230, 189, 0.6)',
        borderWidth: 0,
        pointRadius: 0,
        tension: 0,
      });

     

      // Midline from data (dashed)
      datasets.push({
        label: 'Target Median Value',
        data: currentElementData.map(d => ({ x: d.x, y: d.mid })),
        borderDash: [5, 5],
        borderColor: 'gray',
        backgroundColor: 'transparent',
        pointRadius: 0,
        tension: 0,
        fill: false,
      });
    }

    return {
      labels: currentElementData.map((d) => d.x),
      datasets,
    };
  };

  const chartData = getChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `SJS-Std Concentration Trend - ${selectedElement}`,
        font: { size: 18 },
      },
      legend: {
  display: true,
  labels: {
  usePointStyle: true,
  boxWidth: 100,
  font: { size: 14 },
  filter: function (legendItem, data) {
    const label = legendItem.text;
    const firstIndex = data.datasets.findIndex(ds => ds.label === label);
    return legendItem.datasetIndex === firstIndex;
  },
  generateLabels: function (chart) {
    return chart.data.datasets.map((dataset, i) => {
      let fillColor = '	#e0e0e0'; // default light gray for element
      let pointStyle = dataset.pointStyle || 'circle';
      let lineDash = dataset.borderDash || [];

      if (dataset.label === '10% Error Envelope (against median)') {
        fillColor = 'rgba(173, 230, 189, 0.3)'; // light green box
        pointStyle = 'rect';
      } else if (dataset.label === 'Target Standard Value') {
        fillColor = 'rgba(173, 230, 189, 0.6)'; // slightly darker green box
        pointStyle = 'rect';
      } else if (dataset.label === 'Target Median Value') {
        fillColor = dataset.borderColor || 'gray'; // dashed line color
        pointStyle = 'line';
      }

      return {
        text: dataset.label,
        fillStyle: fillColor,
        strokeStyle: fillColor,
        pointStyle,
        lineDash,
        datasetIndex: i,
      };
    });
  },
}
,
},




      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        title: { display: true, text: xLabel, font: { size: 14 } },
        ticks: { autoSkip: true, maxRotation: 0, minRotation: 0, font: { size: 12 } },
      },
      y: {
        title: { display: true, text: 'Concentration', font: { size: 14 } },
        ticks: { font: { size: 12 } },
        beginAtZero: false,
      },
    },
  };

  if (loading) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" height={400}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>Loading Graph Data...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">SJS-Std Graph</Typography>
          <Autocomplete
            size="small"
            options={availableElements}
            value={selectedElement}
            onChange={(e, newValue) => setSelectedElement(newValue || '')}
            renderInput={(params) => <TextField {...params} label="Select Element" />}
            filterSelectedOptions
            sx={{ minWidth: 250 }}
          />
        </Box>

        {selectedElement && elementData[selectedElement]?.length > 0 ? (
          <Box sx={{ width: '100%', height: 400 }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height={400} bgcolor="#f5f5f5" borderRadius={1}>
            <Typography variant="body1" color="textSecondary">
              No data available for the selected element.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SJS_Graph;
