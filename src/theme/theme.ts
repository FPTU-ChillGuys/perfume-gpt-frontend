import { createTheme, type PaletteMode } from "@mui/material/styles";

export const createAppTheme = (mode: PaletteMode = "light") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#dc2626", // red-600
        light: "#ef4444",
        dark: "#b91c1c",
      },
      secondary: {
        main: "#1f2937", // gray-800
        light: "#374151",
        dark: "#111827",
      },
      ...(mode === "light"
        ? {
            background: {
              default: "#ffffff",
              paper: "#f9fafb",
            },
            text: {
              primary: "#1f2937",
              secondary: "#6b7280",
            },
          }
        : {
            background: {
              default: "#0f172a",
              paper: "#1e293b",
            },
            text: {
              primary: "#f1f5f9",
              secondary: "#94a3b8",
            },
          }),
    },
    typography: {
      fontFamily: [
        '"Inter"',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: "8px 24px",
          },
        },
      },
    },
  });

// Preserve backward-compatible export for any direct import of `theme`
export const theme = createAppTheme("light");

