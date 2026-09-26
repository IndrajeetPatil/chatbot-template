import { act, fireEvent, screen } from "@testing-library/react";
import { vi, expect, test } from "vite-plus/test";

import { renderWithTheme } from "@/client/testUtils";

import AssistantMessage from "./AssistantMessage";

test.each(["light", "dark"] as const)(
  "copies the original markdown in %s mode",
  async (mode) => {
    const content =
      "A **formatted** reply with `inline code`.\n\n```javascript\nconsole.log('hello');\n```\n\n```\nplain block\n```\n\n$E = mc^2$";
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    renderWithTheme(
      <AssistantMessage
        content={content}
        isFirstMessage={false}
      />,
      { mode },
    );
    // Flush the lazy import before querying; appearance is covered by Playwright.
    await act(async () => vi.dynamicImportSettled());
    await expect(screen.findAllByTestId("code-block")).resolves.toHaveLength(2);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(writeText).toHaveBeenLastCalledWith(content);
  },
);

test("the greeting has no copy action", () => {
  renderWithTheme(
    <AssistantMessage
      content="Welcome"
      isFirstMessage
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
