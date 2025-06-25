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

const SJSRow = ({
    row,
    isExpanded,
    toggleRowExpansion,
    miniTableData, // Updated prop to be an object
    pageSize,      // New prop
    handleMiniTablePageChange, // New prop
    miniSortConfig,
    sortMiniTable,
}) => {
    const showTolerance = row.errorAllowedPercent !== 0;
    const statusInfo = showTolerance
        ? row.isWithinTolerance
            ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
            : { icon: <ErrorIcon />, label: 'Fail', color: 'error' }
        : { icon: null, label: '-', color: 'default' };

    const errorToleranceDisplay = !showTolerance ? '-' : `${row.errorAllowedPercent}%`;
    const errorDisplay = !showTolerance
        ? `${row.actualErrorPercent}%`
        : row.actualErrorPercent === 0
            ? '-'
            : `${row.actualErrorPercent}%`;

    const errorColor = !showTolerance
        ? 'text.primary'
        : row.actualErrorPercent < row.errorAllowedPercent
            ? 'success.main'
            : 'error.main';

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
                <TableCell>{row.sjsStd}</TableCell>
                <TableCell>{errorToleranceDisplay}</TableCell>
                <TableCell>
                    <Typography color={errorColor}>{errorDisplay}</Typography>
                </TableCell>
                <TableCell>
                    <Typography
                        color={row.rsd > 10 ? 'error' : row.rsd > 5 ? 'warning.main' : 'success.main'}
                    >
                        {row.rsd}%
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
                <TableCell colSpan={8} sx={{ py: 0, border: 'none' }}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: 1 }}>
                            <Box sx={{ maxHeight: 400, overflowY: 'auto', position: 'relative' }}>
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
                                            {/* ... Other headers ... */}
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
                                                 SJS-Std
                                             </TableCell>
                                             <TableCell sx={{ fontWeight: 600 }}>
                                                 Tolerance%
                                             </TableCell>
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
                                            const showTolerance = entry.tolerance !== 0;
                                            const actualDisplay = entry.tolerance === 0
                                                ? `${entry.actual}%`
                                                : entry.actual === 0
                                                    ? '-'
                                                    : `${entry.actual}%`;

                                            const actualColor = entry.tolerance === 0
                                                ? 'text.primary'
                                                : entry.actual < entry.tolerance
                                                    ? 'success.main'
                                                    : 'error.main';

                                            return (
                                                <TableRow key={i}>
                                                    <TableCell>{entry.timestamp}</TableCell>
                                                    <TableCell>{entry.value}</TableCell>
                                                    <TableCell>{entry.sjsStd}</TableCell>
                                                    <TableCell>{entry.tolerance === 0 ? '-' : `${entry.tolerance}%`}</TableCell>
                                                    <TableCell>
                                                        <Typography color={actualColor}>{actualDisplay}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {showTolerance ? (
                                                            <Chip
                                                                icon={entry.isWithinTolerance ? <CheckCircleIcon /> : <ErrorIcon />}
                                                                label={entry.isWithinTolerance ? 'Pass' : 'Fail'}
                                                                color={entry.isWithinTolerance ? 'success' : 'error'}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        ) : (
                                                            <Chip
                                                                label="-"
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                            {/* --- Pagination Component --- */}
                            {miniTableData.totalItems > pageSize && (
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

export default SJSRow;