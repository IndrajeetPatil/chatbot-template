import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { IconButton, Tooltip, useColorScheme } from "@mui/material";
import type { ReactElement } from "react";

function DarkModeToggle(): ReactElement {
  const { colorScheme, setMode } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tooltip title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
      <IconButton
        onClick={() => {
          setMode(isDark ? "light" : "dark");
        }}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default DarkModeToggle;
