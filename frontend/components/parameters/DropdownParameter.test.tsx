import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DropdownParameter from "./DropdownParameter";

const OPTIONS = [
  { value: "opt1", label: "Option 1" },
  { value: "opt2", label: "Option 2" },
  { value: "opt3", label: "Option 3" },
];

function renderDropdown(onChange = vi.fn()) {
  render(
    <DropdownParameter
      value="opt1"
      onChange={onChange}
      icon={<span>icon</span>}
      tooltipTitle="Select"
      ariaLabel="Select an option"
      options={OPTIONS}
    />,
  );
  return { onChange };
}

describe("DropdownParameter", () => {
  test("renders trigger button with correct aria-label", () => {
    renderDropdown();
    expect(screen.getByLabelText("Select an option")).toBeInTheDocument();
  });

  test("menu is closed initially", () => {
    renderDropdown();
    expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
  });

  test("opens menu and shows all options when button is clicked", () => {
    renderDropdown();
    fireEvent.click(screen.getByLabelText("Select an option"));
    for (const { label } of OPTIONS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test("calls onChange with selected value", () => {
    const { onChange } = renderDropdown();
    fireEvent.click(screen.getByLabelText("Select an option"));
    fireEvent.click(screen.getByText("Option 2"));
    expect(onChange).toHaveBeenCalledWith("opt2");
  });

  test("closes menu without changing value", async () => {
    const { onChange } = renderDropdown();

    fireEvent.click(screen.getByLabelText("Select an option"));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
