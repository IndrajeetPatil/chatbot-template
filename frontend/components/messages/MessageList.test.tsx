import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { makeTextMessage, renderWithTheme } from "@/client/testUtils";
import MessageList from "./MessageList";

const messages = [
  makeTextMessage("initial-message", "assistant", "Welcome"),
  makeTextMessage("user-1", "user", "Question"),
  makeTextMessage("assistant-1", "assistant", "Reply"),
];

test.each(["light", "dark"] as const)(
  "only replies expose a copy action in %s mode",
  (mode) => {
    renderWithTheme(
      <MessageList
        messages={messages}
        assistantIsLoading={false}
        error={undefined}
      />,
      { mode },
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);

test("announces loading and request failures", () => {
  const { rerender } = renderWithTheme(
    <MessageList
      messages={[]}
      assistantIsLoading={true}
      error={undefined}
    />,
  );
  expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  rerender(
    <MessageList
      messages={[]}
      assistantIsLoading={false}
      error={new Error("Network error")}
    />,
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toBeVisible();
});

test("filters non-text parts and joins text parts in order", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    renderWithTheme(
      <MessageList
        messages={[
          {
            id: "reply",
            role: "assistant",
            parts: [
              { type: "text", text: "First " },
              { type: "step-start" },
              { type: "text", text: "second" },
            ],
          },
        ]}
        assistantIsLoading={false}
        error={undefined}
      />,
    );
    // This is a data contract, not a comparison of product copy.
    expect(await screen.findByText("First second")).toBeVisible();
    expect(warn).toHaveBeenCalledOnce();
  } finally {
    warn.mockRestore();
  }
});
