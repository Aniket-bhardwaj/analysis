import React from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Tooltip
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const AnalysisRow = ({ row, isExpanded, toggleRowExpansion }) => {
  const isPass = row.withinLimit;

  const StatusIcon = isPass ? CheckCircleIcon : ErrorIcon;
  const statusColor = isPass ? '#4caf50' : '#f44336';
  const tooltipText = isPass
    ? 'The value of QC for this file is in the error cap'
    : 'The value of QC for this file is outside the error cap';

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => toggleRowExpansion(row.elem)}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {row.elem}
            </Typography>
          </Box>
        </TableCell>

        <TableCell>{row.corrected}</TableCell>

        <TableCell>
          <Tooltip title={tooltipText}>
            <Box
              onClick={() => toggleRowExpansion(row.elem)}
              sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
            >
              <StatusIcon sx={{ color: statusColor }} />
            </Box>
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
                    <TableCell sx={{ color: row.withinLimit ? '#4caf50' : '#f44336' }}>
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
