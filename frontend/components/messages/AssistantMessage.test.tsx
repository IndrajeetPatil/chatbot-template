import { act, fireEvent, screen, waitFor } from "@testing-library/react";
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
    const { container } = renderWithTheme(
      <AssistantMessage
        content={content}
        isFirstMessage={false}
      />,
      { mode },
    );
    // Flush the lazy import before querying; appearance is covered by Playwright.
    await act(async () => vi.dynamicImportSettled());
    expect(container.querySelectorAll("pre > code")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(writeText).toHaveBeenLastCalledWith(content);
    await expect(screen.findByText("Copied")).resolves.toHaveAttribute(
      "aria-live",
      "polite",
    );
  },
);

test("announces a denied clipboard write instead of claiming success", async () => {
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
    new DOMException("Denied", "NotAllowedError"),
  );
  renderWithTheme(
    <AssistantMessage
      content="Reply"
      isFirstMessage={false}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Copy entire message" }));
  await expect(screen.findByText("Copy failed")).resolves.toHaveAttribute(
    "aria-live",
    "polite",
  );
  expect(screen.queryByText("Copied")).not.toBeInTheDocument();
});

test("clears the copy announcement after a short delay", async () => {
  vi.useFakeTimers();
  vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  renderWithTheme(
    <AssistantMessage
      content="Reply"
      isFirstMessage={false}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Copy entire message" }));
  await act(async () => vi.advanceTimersByTimeAsync(0));
  expect(screen.getByText("Copied")).toBeInTheDocument();
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  vi.useRealTimers();
  await waitFor(() => {
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });
});

test("the greeting has no copy action", () => {
  renderWithTheme(
    <AssistantMessage
      content="Welcome"
      isFirstMessage
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
