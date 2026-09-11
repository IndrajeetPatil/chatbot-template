import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { theme } from "@/client/theme";
import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";

import ControlPanel from "./ControlPanel";

const DEFAULT_PROPS = {
  model: AssistantModel.ASTRA,
  setModel: vi.fn(),
  reasoningEffort: ReasoningEffort.MEDIUM,
  setReasoningEffort: vi.fn(),
  onRegenerate: vi.fn(),
  canRegenerate: true,
  disabled: false,
  onSendMessage: vi.fn().mockResolvedValue(undefined),
};

class MockMediaQueryList extends EventTarget implements MediaQueryList {
  readonly matches: boolean;
  readonly media: string;
  onchange:
    | ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown)
    | null = null;

  constructor(matches: boolean, media: string) {
    super();
    this.matches = matches;
    this.media = media;
  }

  addListener(): void {}
  removeListener(): void {}
}

function mockMatchMedia(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      new MockMediaQueryList(
        prefersDark && query === "(prefers-color-scheme: dark)",
        query,
      ),
  );
}

function renderControlPanel(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
  return render(
    <ThemeProvider
      theme={theme}
      noSsr={true}
    >
      <ControlPanel
        {...DEFAULT_PROPS}
        {...overrides}
      />
    </ThemeProvider>,
  );
}

describe("ControlPanel", () => {
  // Vitest's jsdom environment currently has no localStorage (Node's
  // experimental global shadows jsdom's), so MUI's mode persistence is a
  // try/catch-guarded no-op and an unguarded clear() would throw. The optional
  // chain keeps tests isolated if the environment ever gains storage.
  afterEach(() => {
    window.localStorage?.clear();
    vi.unstubAllGlobals();
  });

  test("regenerate button is enabled when canRegenerate is true and not disabled", () => {
    renderControlPanel({ canRegenerate: true, disabled: false });
    expect(screen.getByLabelText("Regenerate response")).not.toBeDisabled();
  });

  test("regenerate button is disabled when canRegenerate is false", () => {
    renderControlPanel({ canRegenerate: false });
    expect(screen.getByLabelText("Regenerate response")).toBeDisabled();
  });

  test("regenerate button is disabled when disabled is true", () => {
    renderControlPanel({ disabled: true });
    expect(screen.getByLabelText("Regenerate response")).toBeDisabled();
  });

  test("clicking regenerate calls onRegenerate", () => {
    const onRegenerate = vi.fn();
    renderControlPanel({ onRegenerate });
    fireEvent.click(screen.getByLabelText("Regenerate response"));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  test("shows dark mode toggle when system preference is not dark", () => {
    renderControlPanel();
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  test("shows light mode toggle when system prefers dark", () => {
    mockMatchMedia(true);
    renderControlPanel();
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  test("clicking the toggle switches from light to dark mode", () => {
    renderControlPanel();
    fireEvent.click(screen.getByLabelText("Switch to dark mode"));
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  test("clicking the toggle switches from dark to light mode", () => {
    mockMatchMedia(true);
    renderControlPanel();
    fireEvent.click(screen.getByLabelText("Switch to light mode"));
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  test("ChatInput receives disabled prop", () => {
    renderControlPanel({ disabled: true });
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
