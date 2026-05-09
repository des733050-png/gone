import React, { useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTheme } from '../theme/ThemeContext';

export default function MuiXProvider({ children }) {
  const { C, isDark } = useTheme();

  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: { main: C.primary },
        background: { default: C.bg, paper: C.surface },
        text: { primary: C.text, secondary: C.textSec },
        divider: C.divider,
      },
      shape: { borderRadius: 10 },
      typography: {
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      },
      components: {
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              backgroundColor: C.inputBg,
              borderRadius: 10,
            },
            notchedOutline: {
              borderColor: C.border,
            },
          },
        },
        MuiInputLabel: {
          styleOverrides: {
            root: { color: C.textMuted },
          },
        },
      },
    });
  }, [C, isDark]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
      </LocalizationProvider>
    </MuiThemeProvider>
  );
}

