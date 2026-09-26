import { useTheme } from "@mui/material";

const useIsDark = (): boolean => {
  const theme = useTheme();
  return theme.palette.mode === "dark";
};

export { useIsDark };
