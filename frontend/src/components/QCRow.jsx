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
  TableSortLabel,
  Typography,
  Pagination, // Import Pagination
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import MiniChart from './MiniChart';

const QCRow = ({
  row,
  isExpanded,
  toggleRowExpansion,
  miniTableData, // Updated prop
  pageSize,      // New prop
  handleMiniTablePageChange, // New prop
  miniSortConfig,
  sortMiniTable,
}) => {
  const statusInfo = row.isWithinTolerance
    ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
    : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

  const miniStatusIcon = (status) => {
    if (status === 'Pass') return { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' };
    if (status === 'Fail') return { icon: <ErrorIcon />, label: 'Fail', color: 'error' };
    return { icon: null, label: 'N/A', color: 'default' };
  };

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
        <TableCell>{row.valueAvg}</TableCell>
        <TableCell>
          <Typography
            color={row.rsd > 10 ? 'error' : row.rsd > 5 ? 'warning.main' : 'success.main'}
          >
            {row.rsd}%
          </Typography>
        </TableCell>
        <TableCell>
          <Typography color={row.errorPercentage > 10 ? 'error' : 'success.main'}>
            {row.errorPercentage}%
          </Typography>
        </TableCell>
        <TableCell>
          {row.distributionData && row.distributionData.length > 0 ? (
            <MiniChart data={row.distributionData} />
          ) : (
            <Chip label="No data" size="small" variant="outlined" />
          )}
        </TableCell>
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
        <TableCell colSpan={6} sx={{ py: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ px: 4, backgroundColor: '#f0f0f0', borderRadius: 1 }}>
              <Box sx={{ maxHeight: '400', overflowY: 'auto', position: 'relative' }}>
                <Table size="small">
                  <TableHead sx={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f0f0f0' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <TableSortLabel
                          active={miniSortConfig[row.element]?.key === 'timestamp'}
                          direction={miniSortConfig[row.element]?.direction || 'asc'}
                          onClick={() => sortMiniTable(row.element, 'timestamp')}
                        >
                          Timestamp
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <TableSortLabel
                          active={miniSortConfig[row.element]?.key === 'value'}
                          direction={miniSortConfig[row.element]?.direction || 'asc'}
                          onClick={() => sortMiniTable(row.element, 'value')}
                        >
                          Value
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <TableSortLabel
                          active={miniSortConfig[row.element]?.key === 'errorPercentage'}
                          direction={miniSortConfig[row.element]?.direction || 'asc'}
                          onClick={() => sortMiniTable(row.element, 'errorPercentage')}
                        >
                          Error%
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {(miniTableData.data || []).map((entry, i) => {
                      const miniStatus =
                        entry.status === 'Pass'
                          ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
                          : entry.status === 'Fail'
                          ? { icon: <ErrorIcon />, label: 'Fail', color: 'error' }
                          : { icon: null, label: 'N/A', color: 'default' };

                      return (
                        <TableRow key={i}>
                          <TableCell>{entry.timestamp}</TableCell>
                          <TableCell>{entry.value}</TableCell>
                          <TableCell>{entry.errorPercentage}</TableCell>
                          <TableCell>
                            <Chip
                              icon={miniStatus.icon}
                              label={miniStatus.label}
                              color={miniStatus.color}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
              {miniTableData.totalItems > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Pagination
                    count={Math.ceil(miniTableData.totalItems / pageSize)}
                    page={miniTableData.currentPage}
                    onChange={(event, value) => handleMiniTablePageChange(row.element, value)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default QCRow;
