import React from 'react';
import {
  Box,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const AnalysisRow = ({ row, isExpanded, toggleRowExpansion }) => {
  const isPass = row.withinLimit;

  const tooltipText = isPass
    ? 'The value of QC for this file is in the error cap'
    : 'The value of QC for this file is outside the error cap';

  // Handler to toggle expansion when clicking the status chip
  const handleStatusClick = () => {
    toggleRowExpansion(row.elem);
  };

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {row.elem}
          </Typography>
        </TableCell>

        <TableCell>{row.corrected}</TableCell>

        <TableCell>
          <Tooltip title={tooltipText}>
            <Chip
              icon={isPass ? <CheckCircleIcon /> : <ErrorIcon />}
              label={isPass ? 'Pass' : 'Fail'}
              color={isPass ? 'success' : 'error'}
              size="small"
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              onClick={handleStatusClick}
            />
          </Tooltip>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={3} sx={{ py: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ px: 4, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Solution</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Avg QC value</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Error%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>{row.solutionLabel}</TableCell>
                    <TableCell>{row.avg}</TableCell>
                    <TableCell sx={{ color: isPass ? '#4caf50' : '#f44336' }}>
                      {row.error}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default AnalysisRow;
