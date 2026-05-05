import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AssistantModel, AssistantTemperature } from "@/client/types/assistant";

vi.mock("@/components/messages/ChatInput", () => ({
  default: ({
    onSendMessage,
    disabled,
  }: {
    onSendMessage: (msg: string) => Promise<void>;
    disabled: boolean;
  }) => (
    <button
      type="button"
      data-testid="chat-input-send"
      data-disabled={String(disabled)}
      onClick={() => void onSendMessage("test message")}
    >
      Send
    </button>
  ),
}));

vi.mock("@/components/parameters/DropdownParameter", () => ({
  default: ({
    onChange,
    ariaLabel,
    options,
    value,
  }: {
    onChange: (v: string) => void;
    ariaLabel: string;
    options: Array<{ value: string; label: string }>;
    value: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option
          key={o.value}
          value={o.value}
        >
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import ControlPanel from "./ControlPanel";

const DEFAULT_PROPS = {
  model: AssistantModel.FULL,
  setModel: vi.fn(),
  temperature: AssistantTemperature.BALANCED,
  setTemperature: vi.fn(),
  onRegenerate: vi.fn(),
  canRegenerate: true,
  darkMode: false,
  onToggleDarkMode: vi.fn(),
  disabled: false,
  onSendMessage: vi.fn().mockResolvedValue(undefined),
};

describe("ControlPanel", () => {
  test("renders model dropdown", () => {
    render(<ControlPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByLabelText(/Select assistant model/i),
    ).toBeInTheDocument();
  });

  test("renders temperature dropdown", () => {
    render(<ControlPanel {...DEFAULT_PROPS} />);
    expect(
      screen.getByLabelText(/Select assistant temperature/i),
    ).toBeInTheDocument();
  });

  test("regenerate button is enabled when canRegenerate is true and not disabled", () => {
    render(
      <ControlPanel
        {...DEFAULT_PROPS}
        canRegenerate={true}
        disabled={false}
      />,
    );
    expect(screen.getByLabelText("Regenerate response")).not.toBeDisabled();
  });

  test("regenerate button is disabled when canRegenerate is false", () => {
    render(
      <ControlPanel
        {...DEFAULT_PROPS}
        canRegenerate={false}
      />,
    );
    expect(screen.getByLabelText("Regenerate response")).toBeDisabled();
  });

  test("regenerate button is disabled when disabled is true", () => {
    render(
      <ControlPanel
        {...DEFAULT_PROPS}
        disabled={true}
      />,
    );
    expect(screen.getByLabelText("Regenerate response")).toBeDisabled();
  });

  test("clicking regenerate calls onRegenerate", () => {
    const onRegenerate = vi.fn();
    render(
      <ControlPanel
        {...DEFAULT_PROPS}
        onRegenerate={onRegenerate}
      />,
    );
    fireEvent.click(screen.getByLabelText("Regenerate response"));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  test("shows dark mode icon when darkMode is false", () => {
    render(
      <ControlPanel
        {...DEFAULT_PROPS}
        darkMode={false}
      />,
    );
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  test("shows light mode icon when darkMode is true", () => {
    render(
      <ControlPanel
        {...DEFAULT_PROPS}
        darkMode={true}
      />,
    );
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  test("clicking dark mode toggle calls onToggleDarkMode", () => {
    const onToggleDarkMode = vi.fn();
    render(
      <ControlPanel
        {...DEFAULT_PROPS}
        darkMode={false}
        onToggleDarkMode={onToggleDarkMode}
      />,
    );
    fireEvent.click(screen.getByLabelText("Switch to dark mode"));
    expect(onToggleDarkMode).toHaveBeenCalledTimes(1);
  });

  test("ChatInput receives disabled prop", () => {
    render(
      <ControlPanel
        {...DEFAULT_PROPS}
        disabled={true}
      />,
    );
    expect(screen.getByTestId("chat-input-send")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });
});
