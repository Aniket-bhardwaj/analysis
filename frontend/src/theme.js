// src/theme.js
import { createTheme } from '@mui/material/styles';

const customTheme = createTheme({
  typography: {
    fontFamily: [
      'Poppins',
      'sans-serif',
    ].join(','),
    h4: {
      fontSize: '2.125rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    body1: {
        fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    // Ensure these are well-defined for the cards
    summaryValue: {
      fontSize: '2.2rem', // Slightly adjust for impact if needed
      fontWeight: 'bold', // Stronger bold for values
      lineHeight: 1.2, // Tighter line height for large numbers
    },
    summaryLabel: {
        fontSize: '0.9rem', // Slightly smaller for labels
        color: '#6c757d', // A subtle grey similar to textSecondary
        lineHeight: 1.5, // Standard line height
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiCardContent: {
        styleOverrides: {
            root: {
                // Ensure text alignment from the original code carries through
                // This will be overridden by `display: 'flex'` in QCChecks.jsx for summary cards
                // but applies to other CardContents.
                textAlign: 'center',
            }
        }
    }
  }
});

export default customTheme;