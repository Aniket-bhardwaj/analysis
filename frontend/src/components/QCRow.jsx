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
  Pagination,
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
  miniTableData,
  pageSize,
  handleMiniTablePageChange,
  miniSortConfig,
  sortMiniTable,
}) => {
  // Main-row status: if isWithinTolerance is null/undefined → N/A
  const statusInfo =
    row.isWithinTolerance == null
      ? { icon: null, label: 'N/A', color: 'default' }
      : row.isWithinTolerance
      ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
      : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => toggleRowExpansion(row.fullElementName)}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {row.fullElementName}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>{row.valueAvg != null ? row.valueAvg : 'N/A'}</TableCell>
        <TableCell>
          {row.rsd != null ? (
            <Typography
              color={
                row.rsd > 10 ? 'error' : row.rsd > 5 ? 'warning.main' : 'success.main'
              }
            >
              {row.rsd}%
            </Typography>
          ) : (
            'N/A'
          )}
        </TableCell>
        <TableCell>
          {row.errorPercentage != null ? (
            <Typography
              color={row.errorPercentage > 10 ? 'error' : 'success.main'}
            >
              {row.errorPercentage}%
            </Typography>
          ) : (
            'N/A'
          )}
        </TableCell>
        <TableCell>
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
            variant={statusInfo.label === 'N/A' ? 'filled' : 'outlined'}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ px: 4, backgroundColor: '#f0f0f0', borderRadius: 1 }}>
              <Box
                sx={{ maxHeight: 400, overflowY: 'auto', position: 'relative' }}
              >
                <Table size="small">
                  <TableHead
                    sx={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: '#f0f0f0',
                    }}
                  >
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <TableSortLabel
                          active={miniSortConfig[row.fullElementName]?.key === 'timestamp'}
                          direction={
                            miniSortConfig[row.fullElementName]?.direction || 'asc'
                          }
                          onClick={() => sortMiniTable(row.fullElementName, 'timestamp')}
                        >
                          Timestamp
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <TableSortLabel
                          active={miniSortConfig[row.fullElementName]?.key === 'value'}
                          direction={
                            miniSortConfig[row.fullElementName]?.direction || 'asc'
                          }
                          onClick={() => sortMiniTable(row.fullElementName, 'value')}
                        >
                          Value
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <TableSortLabel
                          active={
                            miniSortConfig[row.fullElementName]?.key === 'errorPercentage'
                          }
                          direction={
                            miniSortConfig[row.fullElementName]?.direction || 'asc'
                          }
                          onClick={() =>
                            sortMiniTable(row.fullElementName, 'errorPercentage')
                          }
                        >
                          Error%
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {(miniTableData.data || []).map((entry, i) => {
                      // mini-row status: undefined/null → N/A
                      const miniStatus =
                        entry.status == null
                          ? { icon: null, label: 'N/A', color: 'default' }
                          : entry.status === 'Pass'
                          ? {
                              icon: <CheckCircleIcon />,
                              label: 'Pass',
                              color: 'success',
                            }
                          : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

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
                              variant={miniStatus.label === 'N/A' ? 'filled' : 'outlined'}
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
                    onChange={(e, v) => handleMiniTablePageChange(row.fullElementName, v)}
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