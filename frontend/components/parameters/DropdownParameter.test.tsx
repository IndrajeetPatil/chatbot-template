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
      ariaLabel="Select an option"
      options={OPTIONS}
      label="Option 1"
    />,
  );
  return { onChange };
}

describe("DropdownParameter", () => {
  test("calls onChange with selected value", () => {
    const { onChange } = renderDropdown();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Select an option"));
    fireEvent.click(screen.getAllByRole("menuitem")[1]);
    expect(onChange).toHaveBeenCalledWith("opt2");
  });

  test("closes menu without changing value", async () => {
    const { onChange } = renderDropdown();

    fireEvent.click(screen.getByLabelText("Select an option"));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
