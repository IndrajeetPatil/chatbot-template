import { render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("@/components/messages/AssistantMessage", () => ({
  default: ({
    content,
    isFirstMessage,
  }: {
    content: string;
    isFirstMessage: boolean;
  }) => (
    <div
      data-testid="assistant-message"
      data-first-message={String(isFirstMessage)}
    >
      {content}
    </div>
  ),
}));

vi.mock("@/components/messages/UserMessage", () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="user-message">{content}</div>
  ),
}));

import { makeTextMessage } from "@/client/test-utils";
import MessageList from "./MessageList";

const INITIAL_MESSAGE = makeTextMessage(
  "initial-message",
  "assistant",
  "Hi, I am a chat bot.",
);

describe("MessageList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders initial assistant message marked as first message", () => {
    render(
      <MessageList
        messages={[INITIAL_MESSAGE]}
        assistantIsLoading={false}
        error={undefined}
      />,
    );
    const msg = screen.getByTestId("assistant-message");
    expect(msg).toHaveTextContent("Hi, I am a chat bot.");
    expect(msg).toHaveAttribute("data-first-message", "true");
  });

  test("non-initial assistant messages have isFirstMessage false", () => {
    render(
      <MessageList
        messages={[
          INITIAL_MESSAGE,
          makeTextMessage("a2", "assistant", "Reply"),
        ]}
        assistantIsLoading={false}
        error={undefined}
      />,
    );
    const msgs = screen.getAllByTestId("assistant-message");
    expect(msgs[0]).toHaveAttribute("data-first-message", "true");
    expect(msgs[1]).toHaveAttribute("data-first-message", "false");
  });

  test("renders user messages", () => {
    render(
      <MessageList
        messages={[INITIAL_MESSAGE, makeTextMessage("u1", "user", "Hello bot")]}
        assistantIsLoading={false}
        error={undefined}
      />,
    );
    expect(screen.getByTestId("user-message")).toHaveTextContent("Hello bot");
  });

  test("shows loading indicator when assistantIsLoading is true", () => {
    render(
      <MessageList
        messages={[INITIAL_MESSAGE]}
        assistantIsLoading={true}
        error={undefined}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Generating…");
  });

  test("hides loading indicator when assistantIsLoading is false", () => {
    render(
      <MessageList
        messages={[INITIAL_MESSAGE]}
        assistantIsLoading={false}
        error={undefined}
      />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("shows error alert when error is present", () => {
    render(
      <MessageList
        messages={[INITIAL_MESSAGE]}
        assistantIsLoading={false}
        error={new Error("Network error")}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong. Try sending your message again. Details: Network error",
    );
  });

  test("non-text message parts yield empty string and warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <MessageList
        messages={[
          {
            id: "a1",
            role: "assistant" as const,
            parts: [{ type: "step-start" }],
          },
        ]}
        assistantIsLoading={false}
        error={undefined}
      />,
    );
    const msg = screen.getByTestId("assistant-message");
    expect(msg).toHaveTextContent("");
    expect(warnSpy).toHaveBeenCalledWith(
      '[MessageList] Unexpected non-text message part type: "step-start"',
    );
  });
});
