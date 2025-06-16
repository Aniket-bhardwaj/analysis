import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
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
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress, Autocomplete, TextField
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

const QCGraph = ({
  selectedFileId,
  selectedSolutionLabel
}) => {
  const [rawData, setRawData] = useState([]);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const generateColors = () => [
    'rgb(75, 192, 192)',
    'rgb(255, 99, 132)',
    'rgb(54, 162, 235)',
    'rgb(255, 205, 86)',
    'rgb(153, 102, 255)',
    'rgb(255, 159, 64)',
    'rgb(199, 199, 199)',
    'rgb(83, 102, 255)',
  ];

  useEffect(() => {
    if (!selectedFileId || !selectedSolutionLabel) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/graph-data?file_id=${selectedFileId}&solution_label=${encodeURIComponent(selectedSolutionLabel)}`
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const result = await res.json();
        console.log("GRAPH RESULT:", result); // Add this line

        if (!result.success || !result.graphData) {
          throw new Error(result.message || 'Failed to load graph data');
        }

        // Transform the data to match the expected format
        const transformedData = Object.keys(result.graphData).map(element => ({
          element,
          data: result.graphData[element].map((point, index) => ({
            timestamp: point.sample || `Sample ${index + 1}`,
            value: point.value
          }))
        }));

        setRawData(transformedData);
        setElements(Object.keys(result.graphData));

        // Auto-select first element if available
        if (Object.keys(result.graphData).length > 0) {
          setSelectedElement(Object.keys(result.graphData)[0]);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching graph data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedFileId, selectedSolutionLabel]);

  const handleElementClick = (element) => {
    setSelectedElement((prev) => (prev === element ? null : element));
  };

  const chartData = () => {
    if (!selectedElement) return null;
  
    const elementData = rawData.find((d) => d.element === selectedElement);
    if (!elementData) return null;
  
    const timestamps = elementData.data.map((point) => point.timestamp);
    const values = elementData.data.map((point) => point.value);
  
    // Determine range
    const is50ppb = Math.abs(values[0] - 50) < 10;
    const is5ppm = Math.abs(values[0] - 5) < 2;
  
    let target = null;
    let error = null;
  
    if (is5ppm) {
      target = 5;
      error = 0.5;
    } else if (is50ppb) {
      target = 50;
      error = 5;
    }
  
    const lowerLimit = target - error;
    const upperLimit = target + error;
  
    const modernGreen = '#00c04b';
    const modernRed = '#fb3b1e';
    const modernBlue = '#575757';
  
    const datasets = [
      {
        label: selectedElement,
        data: values,
        fill: false,
        borderColor: modernBlue,     // blue line
        borderWidth: 1.5,              // thinner line
        tension: 0.2,
        pointRadius: 5,
        pointHoverRadius: 5.5,
        pointBackgroundColor: values.map(val =>
          val < lowerLimit || val > upperLimit ? modernRed : modernGreen
        ),
        pointBorderColor: 'transparent', // no point border
        pointBorderWidth: 0,             // disable outline
        segment: {
          borderColor: () => modernBlue, // neutral line color
        },
      },
    ];
  
    // Dashed reference lines
    if (target && error) {
      const refLine = (value, label, color) => ({
        label,
        data: Array(timestamps.length).fill(value),
        borderColor: color,
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      });
  
      datasets.push(refLine(target, `Target ${target}`, 'rgba(0,0,0,0.4)'));
      datasets.push(refLine(lowerLimit, `-Range`, 'rgba(255, 0, 0, 0.42)'));
      datasets.push(refLine(upperLimit, `+Range`, 'rgba(255, 0, 0, 0.42)'));
    }
  
    return {
      labels: timestamps,
      datasets,
    };
  };
  

  const getYAxisRange = () => {
    if (!selectedElement) return {};

    const elementData = rawData.find((d) => d.element === selectedElement);
    if (!elementData) return {};

    const values = elementData.data.map((point) => point.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const is50ppb = Math.abs(values[0] - 50) < 10;
    const is5ppm = Math.abs(values[0] - 5) < 2;

    if (is5ppm) {
      return {
        min: 4,
        max: 6,
      };
    }

    if (is50ppb) {
      return {
        min: 40,
        max: 60,
      };
    }

    return {
      min: minVal - 1,
      max: maxVal + 1,
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        title: { display: true, text: 'Timestamp' },
        ticks: { maxTicksLimit: 10 },
      },
      y: {
        title: { display: true, text: 'Value (ppm/ppb)' },
        ...getYAxisRange(),
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>Loading chart...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Quality Control Graph
        </Typography>

        {/* Element Selection Buttons */}
        <Box sx={{ mb: 2, mt: -2, display: 'flex', justifyContent: 'flex-end' }}>
          <Autocomplete
            size="small"
            options={elements}
            value={selectedElement}
            onChange={(event, newValue) => setSelectedElement(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Element"
                variant="outlined"
                sx={{ minWidth: 220 }}
              />
            )}
            sx={{ width: 250 }}
          />
        </Box>

        {/* Chart Container */}
        <Box sx={{ height: 400, width: '100%' }}>
          {selectedElement && chartData() ? (
            <Line data={chartData()} options={chartOptions} />
          ) : (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              backgroundColor: '#f5f5f5',
              borderRadius: 1
            }}>
              <Typography variant="body1" color="textSecondary">
                {elements.length === 0 ? 'No elements available' : 'Click an element above to view its graph'}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default QCGraph;