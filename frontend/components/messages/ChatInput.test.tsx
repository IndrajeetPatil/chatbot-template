import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import ChatInput from "./ChatInput";

describe("ChatInput component", () => {
  test("should call onSendMessage with the message when Ctrl+Enter is pressed", () => {
    const onSendMessageMock = vi.fn();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    const input = screen.getByLabelText("Message");
    fireEvent.change(input, { target: { value: "Hello, World!" } });
    fireEvent.keyDown(input, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
      ctrlKey: true,
    });

    expect(onSendMessageMock).toHaveBeenCalledWith("Hello, World!");
  });

  test("plain Enter does not send a multiline message", () => {
    const onSendMessageMock = vi.fn();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    const input = screen.getByLabelText("Message");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(onSendMessageMock).not.toHaveBeenCalled();
  });

  test("should not call onSendMessage if Ctrl+Enter is pressed with an empty message", () => {
    const onSendMessageMock = vi.fn();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    const input = screen.getByLabelText("Message");
    fireEvent.keyDown(input, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
      ctrlKey: true,
    });

    expect(onSendMessageMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a message before sending.")).toBeVisible();
  });

  test("should send message when send button is clicked", () => {
    const onSendMessageMock = vi.fn();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello via button" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSendMessageMock).toHaveBeenCalledWith("Hello via button");
  });

  test("send button stays enabled when message is empty and surfaces validation", () => {
    const onSendMessageMock = vi.fn();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSendMessageMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a message before sending.")).toBeVisible();
  });

  test("clears empty-submit validation when the user starts typing", () => {
    const onSendMessageMock = vi.fn();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Enter a message before sending.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });

    expect(
      screen.getByText(
        "Press Enter for a new line. Press Ctrl+Enter or Cmd+Enter to send.",
      ),
    ).toBeVisible();
  });

  test("rejects a message that exceeds the maximum length", () => {
    const onSendMessageMock = vi.fn();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "x".repeat(32_001) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSendMessageMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Message is too long (max 32,000 characters)."),
    ).toBeVisible();
  });

  test("send button is disabled when disabled prop is true", () => {
    const onSendMessageMock = vi.fn();
    render(
      <ChatInput
        onSendMessage={onSendMessageMock}
        disabled={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
