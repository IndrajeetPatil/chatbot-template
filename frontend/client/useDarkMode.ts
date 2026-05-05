import { createTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";

const DARK_THEME_COLOR = "#121212";
const LIGHT_THEME_COLOR = "#ffffff";

function syncBrowserTheme(darkMode: boolean) {
  document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", darkMode ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false,
  );

  useEffect(() => {
    syncBrowserTheme(darkMode);
  }, [darkMode]);

  const theme = useMemo(
    () => createTheme({ palette: { mode: darkMode ? "dark" : "light" } }),
    [darkMode],
  );

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return { darkMode, theme, toggleDarkMode };
}

export { useDarkMode };
