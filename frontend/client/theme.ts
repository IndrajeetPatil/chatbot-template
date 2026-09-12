import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#256352", contrastText: "#ffffff" },
        background: { default: "#f7f7f2", paper: "#ffffff" },
        text: { primary: "#242923", secondary: "#646b62" },
        divider: "#dedfd7",
      },
    },
    dark: {
      palette: {
        primary: { main: "#a6d7be", contrastText: "#17271f" },
        background: { default: "#171b18", paper: "#202621" },
        text: { primary: "#edf0e8", secondary: "#adb6a9" },
        divider: "#3b443c",
      },
    },
  },
  typography: {
    fontFamily: '"Geist", sans-serif',
    body1: { lineHeight: 1.75 },
    button: { textTransform: "none", fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          "&.Mui-focusVisible": { outline: "2px solid", outlineOffset: 3 },
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  },
});

export { theme };
