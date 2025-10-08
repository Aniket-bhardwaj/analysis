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
  const showTolerance = row.errorAllowedPercent != null && row.errorAllowedPercent !== 0;

  const statusInfo = !showTolerance
    ? { icon: null, label: 'N/A', color: 'default' }
    : row.isWithinTolerance
    ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
    : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

  const renderOrNA = (value, suffix = '') =>
    value != null && value !== '' ? `${value}${suffix}` : 'N/A';

  const errorColor = !showTolerance
    ? 'text.primary'
    : row.actualErrorPercent < row.errorAllowedPercent
    ? 'success.main'
    : 'error.main';

  const rsdColor =
    row.rsd != null
      ? row.rsd > 10
        ? 'error'
        : row.rsd > 5
        ? 'warning.main'
        : 'success.main'
      : 'text.disabled';

  return (
    <>
      {/* --- Main Table Row --- */}
      <TableRow hover>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => toggleRowExpansion(row.fullElementName)}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {row.fullElementName}
            </Typography>
          </Box>
        </TableCell>

        {/* Dynamic safe rendering for all key metrics */}
        <TableCell>{renderOrNA(row.valueAvg)}</TableCell>
        <TableCell>{renderOrNA(row.sjsStd)}</TableCell>
        <TableCell>
          {row.tolerance_pct != null ? `${row.tolerance_pct}%` : 'N/A'}
        </TableCell>
        <TableCell>
          <Typography color={errorColor}>
            {row.error_pct != null ? `${row.error_pct}%` : 'N/A'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography color={rsdColor}>
            {renderOrNA(row.rsd_pct, '%')}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            icon={row.status === 'Pass' ? <CheckCircleIcon /> : row.status === 'Fail' ? <ErrorIcon /> : null}
            label={row.status ?? 'N/A'}
            color={row.status === 'Pass' ? 'success' : row.status === 'Fail' ? 'error' : 'default'}
            size="small"
            variant={row.status ? 'outlined' : 'filled'}
          />
        </TableCell>

      </TableRow>

      {/* --- Expandable Mini Table --- */}
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, border: 'none' }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: 1 }}>
              <Box
                sx={{ maxHeight: 410, overflowY: 'auto', position: 'relative' }}
              >
                <Table size="small">
                  <TableHead
                    sx={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: '#fafafa',
                    }}
                  >
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
                      const tol =
                        entry.errorAllowedPercent ??
                        entry.tolerance ??
                        0;
                      const actual =
                        entry.actualErrorPercent ??
                        entry.actual ??
                        null;
                      const status = entry.isWithinTolerance ?? null;

                      const miniStatusInfo =
                        status == null
                          ? { icon: null, label: 'N/A', color: 'default' }
                          : status
                          ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
                          : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

                      const actualColor =
                        tol && actual != null
                          ? actual < tol
                            ? 'success.main'
                            : 'error.main'
                          : 'text.primary';

                      return (
                        <TableRow key={i}>
                          <TableCell>
                            {entry.timestamp || entry.created_at || '-'}
                          </TableCell>
                          <TableCell>{renderOrNA(entry.valueAvg ?? entry.value)}</TableCell>
                          <TableCell>{renderOrNA(entry.sjsStd)}</TableCell>
                          <TableCell>{tol ? `${tol}%` : 'N/A'}</TableCell>
                          <TableCell>
                            <Typography color={actualColor}>
                              {actual != null ? `${actual}%` : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={miniStatusInfo.icon}
                              label={miniStatusInfo.label}
                              color={miniStatusInfo.color}
                              size="small"
                              variant={miniStatusInfo.label === 'N/A' ? 'filled' : 'outlined'}
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
                    onChange={(e, v) =>
                      handleMiniTablePageChange(row.fullElementName, v)
                    }
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



// import React from 'react';
// import {
//   Box,
//   Chip,
//   Collapse,
//   IconButton,
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableRow,
//   TableSortLabel,
//   Typography,
//   Pagination,
// } from '@mui/material';
// import {
//   CheckCircle as CheckCircleIcon,
//   Error as ErrorIcon,
//   ExpandLess as ExpandLessIcon,
//   ExpandMore as ExpandMoreIcon,
// } from '@mui/icons-material';
// import MiniChart from './MiniChart';

// const SJSRow = ({
//   row,
//   isExpanded,
//   toggleRowExpansion,
//   miniTableData,
//   pageSize,
//   handleMiniTablePageChange,
//   miniSortConfig,
//   sortMiniTable,
// }) => {
//   const showTolerance = row.errorAllowedPercent !== 0;

//   // Main-row status: If tolerance is not applicable, show N/A
//   const statusInfo = !showTolerance
//     ? { icon: null, label: 'N/A', color: 'default' }
//     : row.isWithinTolerance
//     ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
//     : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

//   // Helper function to render value or N/A
//   const renderOrNA = (value, suffix = '') =>
//     value != null ? `${value}${suffix}` : 'N/A';

//   const errorColor = !showTolerance
//     ? 'text.primary'
//     : row.actualErrorPercent < row.errorAllowedPercent
//     ? 'success.main'
//     : 'error.main';

//   const rsdColor =
//     row.rsd != null
//       ? row.rsd > 10
//         ? 'error'
//         : row.rsd > 5
//         ? 'warning.main'
//         : 'success.main'
//       : 'text.disabled';

//   return (
//     <>
//       <TableRow hover>
//         <TableCell>
//           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//             <IconButton
//               size="small"
//               onClick={() => toggleRowExpansion(row.fullElementName)}
//             >
//               {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
//             </IconButton>
//             <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
//               {row.fullElementName}
//             </Typography>
//           </Box>
//         </TableCell>
//         <TableCell>{renderOrNA(row.valueAvg)}</TableCell>
//         <TableCell>{renderOrNA(row.sjsStd)}</TableCell>
//         <TableCell>
//           {row.errorAllowedPercent != null && row.errorAllowedPercent !== 0
//             ? `${row.errorAllowedPercent}%`
//             : 'N/A'}
//         </TableCell>
//         <TableCell>
//           <Typography color={errorColor}>
//             {row.actualErrorPercent != null
//               ? row.actualErrorPercent !== 0 || showTolerance
//                 ? `${row.actualErrorPercent}%`
//                 : 'N/A'
//               : 'N/A'}
//           </Typography>
//         </TableCell>
//         <TableCell>
//           <Typography color={rsdColor}>{renderOrNA(row.rsd, '%')}</Typography>
//         </TableCell>
//         <TableCell>
//           <Chip
//             icon={statusInfo.icon}
//             label={statusInfo.label}
//             color={statusInfo.color}
//             size="small"
//             variant={statusInfo.label === 'N/A' ? 'filled' : 'outlined'}
//           />
//         </TableCell>
//       </TableRow>

//       <TableRow>
//         <TableCell colSpan={8} sx={{ py: 0, border: 'none' }}>
//           <Collapse in={isExpanded} timeout="auto" unmountOnExit>
//             <Box sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: 1 }}>
//               <Box
//                 sx={{ maxHeight: 410, overflowY: 'auto', position: 'relative' }}
//               >
//                 <Table size="small">
//                   <TableHead
//                     sx={{
//                       position: 'sticky',
//                       top: 0,
//                       zIndex: 2,
//                       backgroundColor: '#fafafa',
//                     }}
//                   >
//                     <TableRow>
//                       <TableCell sx={{ fontWeight: 600 }}>
//                         <TableSortLabel
//                           active={
//                             miniSortConfig[row.element]?.key === 'timestamp'
//                           }
//                           direction={
//                             miniSortConfig[row.element]?.direction || 'asc'
//                           }
//                           onClick={() =>
//                             sortMiniTable(row.element, 'timestamp')
//                           }
//                         >
//                           Timestamp
//                         </TableSortLabel>
//                       </TableCell>
//                       <TableCell sx={{ fontWeight: 600 }}>
//                         <TableSortLabel
//                           active={miniSortConfig[row.element]?.key === 'value'}
//                           direction={
//                             miniSortConfig[row.element]?.direction || 'asc'
//                           }
//                           onClick={() => sortMiniTable(row.element, 'value')}
//                         >
//                           Value
//                         </TableSortLabel>
//                       </TableCell>
//                       <TableCell sx={{ fontWeight: 600 }}>SJS-Std</TableCell>
//                       <TableCell sx={{ fontWeight: 600 }}>Tolerance%</TableCell>
//                       <TableCell sx={{ fontWeight: 600 }}>
//                         <TableSortLabel
//                           active={miniSortConfig[row.element]?.key === 'actual'}
//                           direction={
//                             miniSortConfig[row.element]?.direction || 'asc'
//                           }
//                           onClick={() => sortMiniTable(row.element, 'actual')}
//                         >
//                           Error%
//                         </TableSortLabel>
//                       </TableCell>
//                       <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
//                     </TableRow>
//                   </TableHead>

//                   <TableBody>
//                     {console.log("SJS MiniTable row sample:", miniTableData)}

//                     {(miniTableData.data || []).map((entry, i) => {
//                       const tol = entry.errorAllowedPercent ?? entry.tolerance ?? 0;
//                       const actual = entry.actualErrorPercent ?? entry.actual ?? null;
//                       const status = entry.isWithinTolerance ?? null;

//                       const miniStatusInfo = status == null
//                         ? { icon: null, label: 'N/A', color: 'default' }
//                         : status
//                         ? { icon: <CheckCircleIcon />, label: 'Pass', color: 'success' }
//                         : { icon: <ErrorIcon />, label: 'Fail', color: 'error' };

//                       const actualColor = tol && actual != null
//                         ? actual < tol ? 'success.main' : 'error.main'
//                         : 'text.primary';

//                       return (
//                         <TableRow key={i}>
//                           <TableCell>{entry.timestamp || entry.created_at || '-'}</TableCell>
//                           <TableCell>{renderOrNA(entry.valueAvg ?? entry.value)}</TableCell>
//                           <TableCell>{renderOrNA(entry.sjsStd)}</TableCell>
//                           <TableCell>{tol ? `${tol}%` : 'N/A'}</TableCell>
//                           <TableCell>
//                             <Typography color={actualColor}>
//                               {actual != null ? `${actual}%` : 'N/A'}
//                             </Typography>
//                           </TableCell>
//                           <TableCell>
//                             <Chip
//                               icon={miniStatusInfo.icon}
//                               label={miniStatusInfo.label}
//                               color={miniStatusInfo.color}
//                               size="small"
//                               variant={miniStatusInfo.label === 'N/A' ? 'filled' : 'outlined'}
//                             />
//                           </TableCell>
//                         </TableRow>
//                       );
//                     })}
//                   </TableBody>

//                 </Table>
//               </Box>

//               {miniTableData.totalItems > pageSize && (
//                 <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
//                   <Pagination
//                     count={Math.ceil(miniTableData.totalItems / pageSize)}
//                     page={miniTableData.currentPage}
//                     onChange={(e, v) =>
//                       handleMiniTablePageChange(row.fullElementName, v)
//                     }
//                     color="primary"
//                     size="small"
//                   />
//                 </Box>
//               )}
//             </Box>
//           </Collapse>
//         </TableCell>
//       </TableRow>
//     </>
//   );
// };

// export default SJSRow;
