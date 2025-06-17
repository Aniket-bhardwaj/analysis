import React from 'react';
import {
  Box, Chip, Collapse, IconButton, Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, Typography
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import MiniChart from './MiniChart';

const QCRow = ({ row, isExpanded, toggleRowExpansion, miniTables, miniSortConfig, sortMiniTable }) => {
  const statusInfo = row.isWithinTolerance
    ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
    : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

  const miniStatusIcon = (status) => {
    if (status === 'Pass') return { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' };
    if (status === 'Fail') return { icon: <ErrorIcon />, label: 'Fail', color: 'error' };
    return { icon: null, label: 'N/A', color: 'default' };
  };

  return (
    <React.Fragment>
      <TableRow hover>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => toggleRowExpansion(row.element)}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{row.element}</Typography>
          </Box>
        </TableCell>
        <TableCell>{row.valueAvg}</TableCell>
        <TableCell>
          <Typography color={row.rsd > 10 ? 'error' : row.rsd > 5 ? 'warning.main' : 'success.main'}>{row.rsd}%</Typography>
        </TableCell>
        <TableCell>
          <Typography color={row.errorPercentage > 10 ? 'error' : 'success.main'}>{row.errorPercentage}%</Typography>
        </TableCell>
        <TableCell>
          {row.distributionData && row.distributionData.length > 0 ? (
            <MiniChart data={row.distributionData} />
          ) : (
            <Chip label="No data" size="small" variant="outlined" />
          )}
        </TableCell>
        <TableCell>
          <Chip icon={statusInfo.icon} label={statusInfo.label} color={statusInfo.color} size="small" variant="outlined" />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ px: 4, py: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Measurements for <strong>{row.element}</strong>
              </Typography>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={miniSortConfig[row.element]?.key === 'timestamp'}
                        direction={miniSortConfig[row.element]?.direction || 'asc'}
                        onClick={() => sortMiniTable(row.element, 'timestamp')}
                      >
                        Timestamp
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={miniSortConfig[row.element]?.key === 'value'}
                        direction={miniSortConfig[row.element]?.direction || 'asc'}
                        onClick={() => sortMiniTable(row.element, 'value')}
                      >
                        Value
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={miniSortConfig[row.element]?.key === 'errorPercentage'}
                        direction={miniSortConfig[row.element]?.direction || 'asc'}
                        onClick={() => sortMiniTable(row.element, 'errorPercentage')}
                      >
                        Error%
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {(miniTables[row.element] || []).map((entry, i) => {
                    const { icon, label, color } = miniStatusIcon(entry.status);
                    return (
                      <TableRow key={i}>
                        <TableCell>{entry.timestamp}</TableCell>
                        <TableCell>{entry.value}</TableCell>
                        <TableCell>{entry.errorPercentage}</TableCell>
                        <TableCell>
                          <Chip icon={icon} label={label} color={color} size="small" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

export default QCRow;
