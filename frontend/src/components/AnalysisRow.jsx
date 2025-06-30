import React from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const AnalysisRow = ({ row, isExpanded, toggleRowExpansion, detail }) => {
  const statusInfo =
    row.status === 'Pass'
      ? { icon: <CheckCircleIcon />, color: 'success', label: 'Pass' }
      : { icon: <ErrorIcon />, color: 'error', label: 'Fail' };

  const detailStatus =
    detail?.status === 'Pass'
      ? { icon: <CheckCircleIcon />, color: 'success', label: 'Pass' }
      : detail?.status === 'Fail'
        ? { icon: <ErrorIcon />, color: 'error', label: 'Fail' }
        : { icon: null, color: 'default', label: detail?.status || '-' };

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => toggleRowExpansion(row.element)}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {row.element}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>{row.correctedValue}</TableCell>
        <TableCell>
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
            variant="outlined"
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={3} sx={{ py: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ px: 4, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Avg QC value</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Error%</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail ? (
                    <TableRow>
                      <TableCell>{detail.avgQcValue}</TableCell>
                      <TableCell>{detail.errorPercent}</TableCell>
                      <TableCell>
                        <Chip
                          icon={detailStatus.icon}
                          label={detailStatus.label}
                          color={detailStatus.color}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3}>Loading...</TableCell>
                    </TableRow>
                  )}
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