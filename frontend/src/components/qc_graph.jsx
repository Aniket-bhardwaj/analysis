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
  Filler,
} from 'chart.js';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Autocomplete,
  TextField,
} from '@mui/material';

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatDate = (dateObj) =>
  `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

const QCGraph = ({ selectedFileId, selectedDateRange, title = "Quality Control Graph" }) => {
  const [rawData, setRawData] = useState([]);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildElementUrl = () => {
    const baseUrl = `${import.meta.env.VITE_API_URL}/graph-elements`;
    const params = new URLSearchParams();

    if (selectedFileId) params.append('file_id', selectedFileId);
    else if (selectedDateRange?.startDate && selectedDateRange?.endDate) {
      params.append('start_date', formatDate(new Date(selectedDateRange.startDate)));
      params.append('end_date', formatDate(new Date(selectedDateRange.endDate)));
    }

    return `${baseUrl}?${params.toString()}`;
  };

  const buildGraphUrl = () => {
    const baseUrl = `${import.meta.env.VITE_API_URL}/graph-data`;
    const params = new URLSearchParams();

    if (selectedFileId) params.append('file_id', selectedFileId);
    else if (selectedDateRange?.startDate && selectedDateRange?.endDate) {
      params.append('start_date', formatDate(new Date(selectedDateRange.startDate)));
      params.append('end_date', formatDate(new Date(selectedDateRange.endDate)));
    }

    if (selectedElement) params.append('element', selectedElement);

    return `${baseUrl}?${params.toString()}`;
  };

  // Fetch elements initially
  useEffect(() => {
    if (!selectedFileId && !(selectedDateRange?.startDate && selectedDateRange?.endDate)) return;

    const fetchElements = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = buildElementUrl();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const result = await res.json();
        if (!result.success || !result.elements) throw new Error(result.message || 'Failed to load elements');

        setElements(result.elements);
        if (result.elements.length > 0) setSelectedElement(result.elements[0]);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching elements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchElements();
  }, [selectedFileId, selectedDateRange]);

  // Fetch graph data whenever selectedElement changes
  useEffect(() => {
    if (!selectedElement) return;

    const fetchGraphData = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = buildGraphUrl();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const result = await res.json();
        if (!result.success || !result.graphData) throw new Error(result.message || 'Failed to load graph data');

        const transformedData = Object.keys(result.graphData).map(element => ({
          element,
          data: result.graphData[element].map((point, index) => ({
            timestamp: point.sample || `Sample ${index + 1}`,
            value: point.value,
          })),
        }));

        setRawData(transformedData);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching graph data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [selectedElement, selectedFileId, selectedDateRange]);

  const chartData = () => {
    if (!selectedElement) return null;

    const elementData = rawData.find((d) => d.element === selectedElement);
    if (!elementData) return null;

    const timestamps = elementData.data.map((point) => point.timestamp);
    const values = elementData.data.map((point) => point.value);

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
  type: 'scatter', // 👈 Add this line
  data: values,
  fill: false,
  showLine: false,
  pointRadius: 5,
  pointHoverRadius: 5.5,
  pointBackgroundColor: values.map(val =>
    val < lowerLimit || val > upperLimit ? modernRed : modernGreen
  ),
  pointBorderColor: 'transparent',
  pointBorderWidth: 0,
  pointStyle: 'circle',
  // 👇 Override legend color
  backgroundColor: 'white', // 👈 Add this line
}
,

    ];

    if (target && error) {
      // Lower bound line (used as fill target)
datasets.push({
  label: '10% Error Envelope',
  type: 'line',
  data: timestamps.map(() => lowerLimit),
  borderWidth: 0,
  fill: false,
  pointRadius: 0,
  showLine: true, // ✅ must be true for fill to work
  pointStyle: 'rect', // ✅ box in legend
});

// Upper bound line (visible, fills to lower)
datasets.push({
  label: '10% Error Envelope',
  type: 'line',
  data: timestamps.map(() => upperLimit),
  backgroundColor: 'rgba(173, 230, 189, 0.3)', // ✅ light green fill
  borderWidth: 0,
  fill: '-1',     // ✅ fill to previous dataset
  pointRadius: 0,
  showLine: true, // ✅ must be true to render area
  pointStyle: 'rect', // ✅ box in legend
});


      

      datasets.push({
  label: `Target ${target}`,
  type: 'line',
  data: Array(timestamps.length).fill(target),
  borderColor: 'rgba(0,0,0,0.4)',
  borderWidth: 1,
  borderDash: [5, 5],
  pointRadius: 0,
  fill: false,
  pointStyle: 'line', // 👈 forces line in legend
}

      );
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

    if (is5ppm) return { min: 4, max: 6 };
    if (is50ppb) return { min: 40, max: 60 };

    return { min: minVal - 1, max: maxVal + 1 };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
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
      let fillColor = '	#e0e0e0'; // default to white for element
      

      if (dataset.label === '10% Error Envelope') {
        fillColor = 'rgba(173, 230, 189, 0.3)'; // light green box
      } else if (dataset.label.includes('Target')) {
        fillColor = dataset.borderColor || 'rgba(0,0,0,0.4)'; // dashed line color
      }

      return {
        text: dataset.label,
        fillStyle: fillColor,
        strokeStyle: fillColor,
        pointStyle: dataset.pointStyle || 'circle',
        lineDash: dataset.borderDash || [],
        datasetIndex: i,
      };
    });
  },
}

},
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
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'left' }}>
          {title}
        </Typography>

        <Box sx={{ mb: 2, mt: -2, display: 'flex', justifyContent: 'flex-end' }}>
          <Autocomplete
            size="small"
            options={elements}
            value={selectedElement}
            onChange={(event, newValue) => setSelectedElement(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Select Element" variant="outlined" sx={{ minWidth: 220 }} />
            )}
            sx={{ width: 250 }}
          />
        </Box>

        <Box sx={{ height: 400, width: '100%' }}>
          {selectedElement ? (
  chartData() ? (
    <Line data={chartData()} options={chartOptions} />
  ) : (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Typography variant="body1" color="textSecondary">
        No data for selected element
      </Typography>
    </Box>
  )
) : (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <Typography variant="body1" color="textSecondary">
      Select an element above to view its graph
    </Typography>
  </Box>
)}

        </Box>
      </CardContent>
    </Card>
  );
};

export default QCGraph;
