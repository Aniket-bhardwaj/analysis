// import React, { useState, useEffect } from 'react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
// import { Upload, TrendingUp, Database, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
// import Navbar from '@/components/navbar';

// const DashboardPage = () => {
//   const [dashboardData, setDashboardData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [lastRefresh, setLastRefresh] = useState(null);

//   // Fetch dashboard data
//   const fetchDashboardData = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch('http://localhost:5000/dashboard');
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
      
//       const result = await response.json();
      
//       if (result.success) {
//         setDashboardData(result.data);
//         setLastRefresh(new Date());
//         setError(null);
//       } else {
//         throw new Error(result.message || 'Failed to fetch dashboard data');
//       }
//     } catch (err) {
//       console.error('Error fetching dashboard data:', err);
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Auto-refresh every 5 minutes
//   useEffect(() => {
//     fetchDashboardData();
//     const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
//     return () => clearInterval(interval);
//   }, []);

//   // Handle redirect to uploads page
//   const handleGoToUploads = () => {
//     window.location.href = '/uploads'; // Adjust path as needed
//   };

//   // Format date for display
//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   // Format time ago
//   const formatTimeAgo = (dateString) => {
//     const now = new Date();
//     const date = new Date(dateString);
//     const diffInMs = now - date;
//     const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
//     if (diffInHours < 1) {
//       const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
//       return `${diffInMinutes}m ago`;
//     } else if (diffInHours < 24) {
//       return `${diffInHours}h ago`;
//     } else {
//       const diffInDays = Math.floor(diffInHours / 24);
//       return `${diffInDays}d ago`;
//     }
//   };

//   if (loading && !dashboardData) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error && !dashboardData) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
//           <h2 className="mt-4 text-xl font-semibold text-gray-900">Error Loading Dashboard</h2>
//           <p className="mt-2 text-gray-600">{error}</p>
//           <button
//             onClick={fetchDashboardData}
//             className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Retry
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const { summary, recentFiles, qcChart, qcStatistics } = dashboardData || {};

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white shadow-sm border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-6">
//             <div>
//               <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
//               <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
//               <p className="mt-1 text-sm text-gray-500">
//                 {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
//               </p>
//             </div>
//             <div className="flex gap-3">
//               <button
//                 onClick={fetchDashboardData}
//                 disabled={loading}
//                 className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
//               >
//                 {loading ? 'Refreshing...' : 'Refresh'}
//               </button>
//               <button
//                 onClick={handleGoToUploads}
//                 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
//               >
//                 <Upload className="h-4 w-4" />
//                 Upload Files
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Summary Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center">
//               <div className="flex-shrink-0">
//                 <FileText className="h-8 w-8 text-blue-600" />
//               </div>
//               <div className="ml-4">
//                 <h3 className="text-sm font-medium text-gray-500">Total Files</h3>
//                 <p className="text-2xl font-bold text-gray-900">{summary?.totalFiles || 0}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center">
//               <div className="flex-shrink-0">
//                 <Database className="h-8 w-8 text-green-600" />
//               </div>
//               <div className="ml-4">
//                 <h3 className="text-sm font-medium text-gray-500">Total Samples</h3>
//                 <p className="text-2xl font-bold text-gray-900">{summary?.totalSamples || 0}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center">
//               <div className="flex-shrink-0">
//                 <TrendingUp className="h-8 w-8 text-purple-600" />
//               </div>
//               <div className="ml-4">
//                 <h3 className="text-sm font-medium text-gray-500">This Week</h3>
//                 <p className="text-2xl font-bold text-gray-900">{summary?.weeklyFiles || 0}</p>
//                 <p className="text-xs text-gray-500">files uploaded</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center">
//               <div className="flex-shrink-0">
//                 <CheckCircle className={`h-8 w-8 ${(summary?.qcPassRate || 0) >= 80 ? 'text-green-600' : 'text-red-600'}`} />
//               </div>
//               <div className="ml-4">
//                 <h3 className="text-sm font-medium text-gray-500">QC Pass Rate</h3>
//                 <p className="text-2xl font-bold text-gray-900">{summary?.qcPassRate || 0}%</p>
//                 <p className="text-xs text-gray-500">past week</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* QC Trend Chart */}
//           <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">QC Pass Rate Trend (Past Week)</h3>
//             {qcChart?.dailySummaries?.length > 0 ? (
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={qcChart.dailySummaries}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis 
//                     dataKey="date" 
//                     tickFormatter={formatDate}
//                     tick={{ fontSize: 12 }}
//                   />
//                   <YAxis 
//                     domain={[0, 100]}
//                     tick={{ fontSize: 12 }}
//                     label={{ value: 'Pass Rate (%)', angle: -90, position: 'insideLeft' }}
//                   />
//                   <Tooltip 
//                     formatter={(value, name) => [`${value}%`, 'Pass Rate']}
//                     labelFormatter={(label) => `Date: ${formatDate(label)}`}
//                     contentStyle={{
//                       backgroundColor: '#fff',
//                       border: '1px solid #ccc',
//                       borderRadius: '6px'
//                     }}
//                   />
//                   <Legend />
//                   <Line 
//                     type="monotone" 
//                     dataKey="averagePassRate" 
//                     stroke="#2563eb" 
//                     strokeWidth={3}
//                     dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
//                     activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
//                   />
//                 </LineChart>
//               </ResponsiveContainer>
//             ) : (
//               <div className="h-64 flex items-center justify-center text-gray-500">
//                 <div className="text-center">
//                   <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
//                   <p>No QC data available for the past week</p>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* QC Statistics */}
//           <div className="bg-white rounded-lg shadow p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">QC Statistics</h3>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center">
//                 <span className="text-sm text-gray-600">Total QC Runs</span>
//                 <span className="font-semibold">{qcStatistics?.totalQCRuns || 0}</span>
//               </div>
              
//               <div className="flex justify-between items-center">
//                 <span className="text-sm text-gray-600">Average RSD</span>
//                 <span className="font-semibold">{qcStatistics?.averageRSD || 0}%</span>
//               </div>
              
//               <div className="flex justify-between items-center">
//                 <span className="text-sm text-gray-600">Average Error</span>
//                 <span className="font-semibold">{qcStatistics?.averageError || 0}%</span>
//               </div>
              
//               <hr className="my-3" />
              
//               <div className="flex justify-between items-center">
//                 <span className="text-sm text-gray-600">PPM Files</span>
//                 <span className="font-semibold text-blue-600">{qcStatistics?.ppmFiles || 0}</span>
//               </div>
              
//               <div className="flex justify-between items-center">
//                 <span className="text-sm text-gray-600">PPB Files</span>
//                 <span className="font-semibold text-green-600">{qcStatistics?.ppbFiles || 0}</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* QC Runs by Day Chart */}
//         {qcChart?.dailySummaries?.length > 0 && (
//           <div className="mt-8 bg-white rounded-lg shadow p-6">
//             <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily QC Runs</h3>
//             <ResponsiveContainer width="100%" height={250}>
//               <BarChart data={qcChart.dailySummaries}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis 
//                   dataKey="date" 
//                   tickFormatter={formatDate}
//                   tick={{ fontSize: 12 }}
//                 />
//                 <YAxis tick={{ fontSize: 12 }} />
//                 <Tooltip 
//                   formatter={(value, name) => [value, name === 'ppmRuns' ? 'PPM Runs' : 'PPB Runs']}
//                   labelFormatter={(label) => `Date: ${formatDate(label)}`}
//                 />
//                 <Legend />
//                 <Bar dataKey="ppmRuns" stackId="a" fill="#3b82f6" name="PPM Files" />
//                 <Bar dataKey="ppbRuns" stackId="a" fill="#10b981" name="PPB Files" />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         )}

//         {/* Recent Files */}
//         <div className="mt-8 bg-white rounded-lg shadow">
//           <div className="px-6 py-4 border-b border-gray-200">
//             <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
//           </div>
//           <div className="divide-y divide-gray-200">
//             {recentFiles && recentFiles.length > 0 ? (
//               recentFiles.map((file, index) => (
//                 <div key={file.id || index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center">
//                       <FileText className="h-5 w-5 text-gray-400 mr-3" />
//                       <div>
//                         <p className="text-sm font-medium text-gray-900">{file.name}</p>
//                         <p className="text-xs text-gray-500">Type: {file.type}</p>
//                       </div>
//                     </div>
//                     <div className="flex items-center text-sm text-gray-500">
//                       <Clock className="h-4 w-4 mr-1" />
//                       {formatTimeAgo(file.uploadedAt)}
//                     </div>
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <div className="px-6 py-8 text-center text-gray-500">
//                 <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
//                 <p>No recent files found</p>
//               </div>
//             )}
//           </div>
//           {recentFiles && recentFiles.length > 0 && (
//             <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
//               <button
//                 onClick={handleGoToUploads}
//                 className="text-sm text-blue-600 hover:text-blue-800 font-medium"
//               >
//                 View all files →
//               </button>
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="mt-8 text-center text-sm text-gray-500">
//           <p>Dashboard auto-refreshes every 5 minutes</p>
//           {error && (
//             <p className="mt-2 text-red-600">
//                {error}
//             </p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DashboardPage;
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "../styles/homepage.css"; 
import Navbar from '@/components/navbar';
import { Box, 
        Typography,
        Button } from '@mui/material';

const DashboardPage = () => {
  const [selectedItem, setSelectedItem] = useState('Dashboard')
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = location.state?.loggedIn;

  return (
    <Box className="dashboard-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />      
      {/* Main content area */}
      <Box component="main" className="main-content">
        <Typography variant="h4" component="h1" className="main-title">
          {selectedItem}
        </Typography>
        <Typography variant="body1" className="main-subtitle">
          Welcome to the {selectedItem} section.
        </Typography>
      </Box>
    </Box>
  );
};

export default DashboardPage;