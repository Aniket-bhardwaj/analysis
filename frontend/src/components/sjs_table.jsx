import React from 'react';
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
} from '@mui/material';

const demoData = [
  {
    element: 'Na',
    measured: 10.5,
    expected: 10.0,
    error: '5%',
    rsd: '2.1%',
  },
  {
    element: 'K',
    measured: 20.1,
    expected: 19.8,
    error: '1.5%',
    rsd: '1.8%',
  },
  {
    element: 'Mg',
    measured: 5.4,
    expected: 5.0,
    error: '8%',
    rsd: '3.3%',
  },
];

const SJS_Table = ({ selectedFileId }) => {
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        SJS Table (Demo)
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><strong>Element</strong></TableCell>
            <TableCell><strong>Measured</strong></TableCell>
            <TableCell><strong>Expected</strong></TableCell>
            <TableCell><strong>% Error</strong></TableCell>
            <TableCell><strong>RSD</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {demoData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.element}</TableCell>
              <TableCell>{row.measured}</TableCell>
              <TableCell>{row.expected}</TableCell>
              <TableCell>{row.error}</TableCell>
              <TableCell>{row.rsd}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default SJS_Table;
