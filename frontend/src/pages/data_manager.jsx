import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/navbar';
import {
    Box,
    Typography,
    Button,
    Table,
    Card,
    CardContent,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Avatar,
    IconButton,
    TextField,
    Stack
} from '@mui/material'

import {
    CloudUpload,
    Delete ,
    DateRange
} from '@mui/icons-material';

import '../styles/data_manager.css';

const DataManagerPage = () => {

    const [files, setfiles] = useState([
        {
            id: 1,
            name: 'Sample File 1',
            type: 'CSV',
            user: 'User A',
            email: 'randomemail@gmail.com',
            uploadDate: '2023-10-01',
            status: 'Uploaded'
        }
    ]);

    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e)=>{
        e.preventDefault();
        e.stopPropagation();

        if(e.type == 'dragenter' || e.type == 'dragover'){
            setDragActive(true);
        }
        else if(e.type == 'dragleave'){
            setDragActive(false);
        }
    };

    const handleDrop = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if(e.datatransfer.files && e.dataTransfer.files[0]){
            handleFiles(e.target.files);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (files)=>{
        const newFiles = Array.from(FileList).map((files, index) => ({
            id: files.length + index + 1,
            name: files.name.split('.')[0],
            type: files.name.split('.').pop().toUpperCase(),
            user: 'Current User',
            email: 'randommail@gmail.com',
            uploadDate: new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', '')
        }));
        setFiles([...files, ...newFiles]);
    };

    const handleDelete = (id) => {
        setFiles(files.filter(file => file.id !== id));
    };

    const [selectedItem, setSelectedItem] = useState('Data Manager');
    const location = useLocation();
    const navigate = useNavigate();
    
     return (
    <Box className="file-upload-container">
      <Navbar />
      
      <Box className="main-content">
        <Box className="header-section">
          <Typography variant="h4" className="page-title">
            Upload
          </Typography>
          
          <Stack direction="row" spacing={2} className="date-filters">
            <TextField
              type="date"
              defaultValue="2025-04-17"
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: <DateRange className="date-icon" />
              }}
            />
            <TextField
              type="date"
              defaultValue="2025-04-17"
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: <DateRange className="date-icon" />
              }}
            />
          </Stack>
        </Box>

        <Card className="upload-card">
          <CardContent>
            <Box
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <CloudUpload className="upload-icon" />
              <Button
                variant="contained"
                component="label"
                className="upload-button"
                startIcon={<CloudUpload />}
                size="large"
              >
                Choose file
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={handleFileSelect}
                />
              </Button>
              <Typography variant="body2" className="upload-text">
                or drag file in here
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card className="files-table-card">
          <CardContent>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow className="table-header">
                    <TableCell className="table-cell-header">#</TableCell>
                    <TableCell className="table-cell-header">Filename</TableCell>
                    <TableCell className="table-cell-header">Type</TableCell>
                    <TableCell className="table-cell-header">User</TableCell>
                    <TableCell className="table-cell-header">Upload Date</TableCell>
                    <TableCell className="table-cell-header">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map((file, index) => (
                    <TableRow key={file.id} className="table-row">
                      <TableCell className="table-cell">{index + 1}</TableCell>
                      <TableCell className="filename-cell">
                        <Typography variant="body2" className="filename-text">
                          {file.name}
                        </Typography>
                      </TableCell>
                      <TableCell className="table-cell">
                        <Chip 
                          label={file.type} 
                          className="file-type-chip"
                          size="small"
                        />
                      </TableCell>
                      <TableCell className="table-cell">
                        <Box className="user-cell">
                          <Box className="user-info">
                            <Typography variant="body2" className="user-name">
                              {file.user}
                            </Typography>
                            <Typography variant="caption" className="user-email">
                              {file.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell className="table-cell">
                        <Typography variant="body2" className="date-text">
                          {file.uploadDate}
                        </Typography>
                      </TableCell>
                      <TableCell className="table-cell">
                        <IconButton
                          onClick={() => handleDelete(file.id)}
                          className="delete-button"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default DataManagerPage;

