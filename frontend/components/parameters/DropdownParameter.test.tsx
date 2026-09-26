import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { vi, test, describe, expect } from "vite-plus/test";

import DropdownParameter from "./DropdownParameter";

const OPTIONS = [
  { value: "opt1", label: "Option 1" },
  { value: "opt2", label: "Option 2" },
  { value: "opt3", label: "Option 3" },
];

function renderDropdown(onChange = vi.fn<(value: string) => void>()) {
  render(
    <DropdownParameter
      value="opt1"
      onChange={onChange}
      icon={<span>icon</span>}
      ariaLabel="Select an option"
      options={OPTIONS}
      label="Option 1"
    />,
  );
  return { onChange };
}

describe(DropdownParameter, () => {
  test("calls onChange with selected value", () => {
    const { onChange } = renderDropdown();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Select an option"));
    fireEvent.click(screen.getAllByRole("menuitem")[1]);
    expect(onChange).toHaveBeenCalledWith("opt2");
  });

  test("closes menu on Escape and returns focus without changing value", async () => {
    const { onChange } = renderDropdown();

    const button = screen.getByLabelText("Select an option");
    act(() => {
      button.focus();
    });
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
    expect(button).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });
});
