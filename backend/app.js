const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

// Initialize app
const app = express();
const PORT = process.env.PORT || 8080;

// Startup log
console.log("Starting backend server...");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
// Correctly configure CORS to accept credentials from the frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4028', // Replace with your frontend's actual URL
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));  // serve uploaded files

// Session middleware
app.use(session({
  secret: 'your_secret_key', // It's recommended to use an environment variable for the secret
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// Authentication middleware to protect routes
const isAuthenticated = (req, res, next) => {
  // Check if user session exists
  if (req.session && req.session.user) {
    // Extend session on activity
    req.session.cookie.expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    return next();
  }
  // If no session, deny access
  res.status(401).json({ error: 'Unauthorized: Please log in.' });
};


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


// Mount auth routes (publicly accessible)
app.use('/api/auth', authRoutes);

// Mount all other API routes under '/api' and protect them with the isAuthenticated middleware
app.use('/api', isAuthenticated, uploadRoutes);
app.use('/api', isAuthenticated, listRoutes);
app.use('/api', isAuthenticated, previewRoutes);
app.use('/api', isAuthenticated, hideRoutes);
app.use('/api', isAuthenticated, graphRoutes);
app.use('/api', isAuthenticated, tableRoutes);
app.use('/api', isAuthenticated, downloadRoutes);
app.use('/api', isAuthenticated, qcCheckRoutes);
app.use('/api', isAuthenticated, dashboardRoutes);
app.use('/api', isAuthenticated, sampleRoutes);
app.use('/api', isAuthenticated, elementRoutes);


// Fallback for unknown routes
app.use((req, res) => {
  console.warn('Unhandled route hit:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});