import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { cdp } from "vite-plus/test/browser";

import { theme } from "@/client/theme";
import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";

import ControlPanel from "./ControlPanel";

type ControlPanelProps = ComponentProps<typeof ControlPanel>;

// Chromium evaluates the real media query, as it does for users.
async function emulatePrefersColorScheme(value: "dark" | "") {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value }],
  });
}

function renderControlPanel(overrides: Partial<ControlPanelProps> = {}) {
  const props: ControlPanelProps = {
    model: AssistantModel.ASTRA,
    setModel: vi.fn<ControlPanelProps["setModel"]>(),
    reasoningEffort: ReasoningEffort.MEDIUM,
    setReasoningEffort: vi.fn<ControlPanelProps["setReasoningEffort"]>(),
    onRegenerate: vi.fn<ControlPanelProps["onRegenerate"]>(),
    canRegenerate: true,
    disabled: false,
    onSendMessage: vi.fn<ControlPanelProps["onSendMessage"]>(),
    onStop: vi.fn<ControlPanelProps["onStop"]>(),
    ...overrides,
  };
  return render(
    <ThemeProvider
      theme={theme}
      noSsr
    >
      <ControlPanel
        model={props.model}
        setModel={props.setModel}
        reasoningEffort={props.reasoningEffort}
        setReasoningEffort={props.setReasoningEffort}
        onRegenerate={props.onRegenerate}
        canRegenerate={props.canRegenerate}
        disabled={props.disabled}
        onSendMessage={props.onSendMessage}
        onStop={props.onStop}
      />
    </ThemeProvider>,
  );
}

describe(ControlPanel, () => {
  // MUI persists the chosen mode in localStorage; clear it so each test
  // starts from the system preference.
  afterEach(async () => {
    localStorage.clear();
    await emulatePrefersColorScheme("");
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
    const onRegenerate = vi.fn<() => void>();
    renderControlPanel({ onRegenerate });
    fireEvent.click(screen.getByLabelText("Regenerate response"));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  test("shows dark mode toggle when system preference is not dark", () => {
    renderControlPanel();
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  test("shows light mode toggle when system prefers dark", async () => {
    await emulatePrefersColorScheme("dark");
    renderControlPanel();
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  test("clicking the toggle switches from light to dark mode", () => {
    renderControlPanel();
    fireEvent.click(screen.getByLabelText("Switch to dark mode"));
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  test("clicking the toggle switches from dark to light mode", async () => {
    await emulatePrefersColorScheme("dark");
    renderControlPanel();
    fireEvent.click(screen.getByLabelText("Switch to light mode"));
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  test("disables the composer but keeps stop available while busy", () => {
    renderControlPanel({ disabled: true });
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Stop generating" }),
    ).toBeEnabled();
  });
});
