import type { UIMessage } from "@ai-sdk/react";
import { createTheme, ThemeProvider } from "@mui/material";
import {
  type RenderOptions,
  type RenderResult,
  render,
} from "@testing-library/react";
import type React from "react";

type PaletteMode = "light" | "dark";

/**
 * A MUI ThemeProvider wrapper shared across component tests. Pass a palette
 * `mode` to exercise light/dark behaviour; omit it for the default theme.
 */
export const makeThemeWrapper =
  (mode?: PaletteMode): React.FC<{ children: React.ReactNode }> =>
  ({ children }) => (
    <ThemeProvider
      theme={createTheme(mode ? { palette: { mode } } : undefined)}
    >
      {children}
    </ThemeProvider>
  );

/** Render `ui` inside the shared themed provider. */
export const renderWithTheme = (
  ui: React.ReactNode,
  { mode, ...options }: RenderOptions & { mode?: PaletteMode } = {},
): RenderResult => render(ui, { wrapper: makeThemeWrapper(mode), ...options });

/** Build a minimal single-part text UIMessage for chat-list tests. */
export const makeTextMessage = (
  id: string,
  role: "user" | "assistant",
  text: string,
): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});
