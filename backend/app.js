const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRoutes = require('./routes/upload');
const listRoutes = require('./routes/list');
const previewRoutes = require('./routes/preview');
const hideRoutes = require('./routes/hide');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount all routes at root path
app.use('/', uploadRoutes);
app.use('/', listRoutes);
app.use('/', previewRoutes);
app.use('/', hideRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
