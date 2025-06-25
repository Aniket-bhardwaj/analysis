const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { generateFakeFiles } = require('./populatedb'); 

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

//  Mount all app routes at `/` (except auth)
app.use('/', uploadRoutes);
app.use('/', listRoutes);
app.use('/', previewRoutes);
app.use('/', hideRoutes);
app.use('/', graphRoutes);
app.use('/', tableRoutes);
app.use('/', downloadRoutes);
app.use('/', qcCheckRoutes);
app.use('/auth', authRoutes);
app.use('/', dashboardRoutes);

// Fallback for unknown routes
app.use((req, res) => {
  console.warn('Unhandled route hit:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

async function insertFakeData() {
  try{
    console.log('Generating fake data...');
    await generateFakeFiles();
    console.log('Fake data generation completed');
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to generate fake data:', error);
    console.log('Starting server anyway...');
    
    // Start server even if fake data generation fails
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

insertFakeData();
