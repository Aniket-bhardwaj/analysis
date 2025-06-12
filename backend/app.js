const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Routes
const uploadRoutes = require('./routes/upload');
const listRoutes = require('./routes/list');
const previewRoutes = require('./routes/preview');
const hideRoutes = require('./routes/hide');
const authRoutes = require('./routes/auth');
const graphRoutes = require('./routes/graphRoutes');
const tableRoutes = require('./routes/tables'); 
const downloadRouter = require('./routes/download.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensures uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));  // Serve uploaded files


// Mount routes
app.use('/', uploadRoutes);
app.use('/', listRoutes);
app.use('/', previewRoutes);
app.use('/', hideRoutes);
app.use('/auth', authRoutes);
app.use('/', graphRoutes); // /api/graph-data
app.use('/', tableRoutes);
app.use('/', downloadRouter);

// Start server
app.listen(PORT,'0.0.0.0',() => {
  console.log(`Server running on http://localhost:${PORT}`);
});
