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
  RemoveCircleOutline as RemoveCircleOutlineIcon, // ← import minus-circle
} from '@mui/icons-material';
import MiniChart from './MiniChart';

const SJSRow = ({
  row,
  isExpanded,
  toggleRowExpansion,
  miniTableData,
  pageSize,
  handleMiniTablePageChange,
  miniSortConfig,
  sortMiniTable,
}) => {
  const showTolerance = row.errorAllowedPercent !== 0;
  const statusInfo = !showTolerance
    ? { icon: <RemoveCircleOutlineIcon />, label: '', color: 'default' }
    : row.isWithinTolerance
      ? { icon: <CheckCircleIcon />,     label: 'Pass', color: 'success' }
      : { icon: <ErrorIcon />,           label: 'Fail', color: 'error' };

  const renderOrIcon = (value, suffix = '') =>
    value != null
      ? `${value}${suffix}`
      : <RemoveCircleOutlineIcon fontSize="small" />;

  const errorColor = !showTolerance
    ? 'text.primary'
    : row.actualErrorPercent < row.errorAllowedPercent
      ? 'success.main'
      : 'error.main';

  const rsdColor = row.rsd != null
    ? row.rsd > 10
      ? 'error'
      : row.rsd > 5
        ? 'warning.main'
        : 'success.main'
    : 'text.disabled';

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
        <TableCell>
          {row.valueAvg != null
            ? row.valueAvg
            : <RemoveCircleOutlineIcon fontSize="small" />}
        </TableCell>
        <TableCell>
          {row.sjsStd != null
            ? row.sjsStd
            : <RemoveCircleOutlineIcon fontSize="small" />}
        </TableCell>
        <TableCell>
          {row.errorAllowedPercent != null && row.errorAllowedPercent !== 0
            ? `${row.errorAllowedPercent}%`
            : <RemoveCircleOutlineIcon fontSize="small" />}
        </TableCell>
        <TableCell>
          <Typography color={errorColor}>
            {row.actualErrorPercent != null
              ? row.actualErrorPercent !== 0 || showTolerance
                ? `${row.actualErrorPercent}%`
                : <RemoveCircleOutlineIcon fontSize="small" />
              : <RemoveCircleOutlineIcon fontSize="small" />}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography color={rsdColor}>
            {row.rsd != null
              ? `${row.rsd}%`
              : <RemoveCircleOutlineIcon fontSize="small" />}
          </Typography>
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
        <TableCell colSpan={8} sx={{ py: 0, border: 'none' }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: 1 }}>
              <Box sx={{ maxHeight: 410, overflowY: 'auto', position: 'relative' }}>
                <Table size="small">
                  <TableHead sx={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#fafafa' }}>
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
                      <TableCell sx={{ fontWeight: 600 }}>SJS-Std</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tolerance%</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <TableSortLabel
                          active={miniSortConfig[row.element]?.key === 'actual'}
                          direction={miniSortConfig[row.element]?.direction || 'asc'}
                          onClick={() => sortMiniTable(row.element, 'actual')}
                        >
                          Error%
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {(miniTableData.data || []).map((entry, i) => {
                      const rowHasTol = entry.tolerance !== 0;
                      const miniStatusInfo = !rowHasTol
                        ? { icon: <RemoveCircleOutlineIcon />, label: '', color: 'default' }
                        : entry.isWithinTolerance
                          ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
                          : { icon: <ErrorIcon />,     label: 'Fail', color: 'error' };

                      const actualColor = rowHasTol
                        ? (entry.actual < entry.tolerance ? 'success.main' : 'error.main')
                        : 'text.primary';

                      return (
                        <TableRow key={i}>
                          <TableCell>{entry.timestamp}</TableCell>
                          <TableCell>
                            {entry.value != null
                              ? entry.value
                              : <RemoveCircleOutlineIcon fontSize="small" />}
                          </TableCell>
                          <TableCell>
                            {entry.sjsStd != null
                              ? entry.sjsStd
                              : <RemoveCircleOutlineIcon fontSize="small" />}
                          </TableCell>
                          <TableCell>
                            {entry.tolerance != null && entry.tolerance !== 0
                              ? `${entry.tolerance}%`
                              : <RemoveCircleOutlineIcon fontSize="small" />}
                          </TableCell>
                          <TableCell>
                            <Typography color={actualColor}>
                              {entry.actual != null
                                ? (entry.actual !== 0 || rowHasTol
                                  ? `${entry.actual}%`
                                  : <RemoveCircleOutlineIcon fontSize="small" />)
                                : <RemoveCircleOutlineIcon fontSize="small" />}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={miniStatusInfo.icon}
                              label={miniStatusInfo.label}
                              color={miniStatusInfo.color}
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

              {miniTableData.totalItems > pageSize && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Pagination
                    count={Math.ceil(miniTableData.totalItems / pageSize)}
                    page={miniTableData.currentPage}
                    onChange={(e, v) => handleMiniTablePageChange(row.element, v)}
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

export default SJSRow;