const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');


// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Startup log
console.log("Starting backend server...");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));  // serve uploaded files

// Route imports
const uploadRoutes    = require('./routes/upload');
const listRoutes      = require('./routes/list');
const previewRoutes   = require('./routes/preview');
const hideRoutes      = require('./routes/hide');
const authRoutes      = require('./routes/auth');
const graphRoutes     = require('./routes/graph');
const tableRoutes     = require('./routes/tables'); 
const downloadRoutes  = require('./routes/download');
const qcCheckRoutes   = require('./routes/qcCheck');
const dashboardRoutes = require('./routes/dashboard');
const sampleRoutes = require('./routes/sample')
const elementRoutes = require('./routes/element');

//  Mount all app routes at `/` (except auth)
// Mount all app routes at `/api` (except auth which is under /api/auth)
app.use('/api', uploadRoutes);
app.use('/api', listRoutes);
app.use('/api', previewRoutes);
app.use('/api', hideRoutes);
app.use('/api', graphRoutes);
app.use('/api', tableRoutes);
app.use('/api', downloadRoutes);
app.use('/api', qcCheckRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', sampleRoutes);
app.use('/api', elementRoutes);
app.use('/api/auth', authRoutes);



// Fallback for unknown routes
app.use((req, res) => {
  console.warn('Unhandled route hit:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
