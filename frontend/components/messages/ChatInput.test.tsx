import { fireEvent, render, screen } from "@testing-library/react";
import { vi, describe, test, expect } from "vite-plus/test";

import ChatInput from "./ChatInput";

describe(ChatInput, () => {
  test("should call onSendMessage with the message when Ctrl+Enter is pressed", () => {
    const onSendMessageMock = vi.fn<(message: string) => void>();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    const input = screen.getByLabelText("Message");
    fireEvent.change(input, { target: { value: "  Hello, World!  " } });
    fireEvent.keyDown(input, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
      ctrlKey: true,
    });

    expect(onSendMessageMock).toHaveBeenCalledWith("Hello, World!");
  });

  test("plain Enter does not send a multiline message", () => {
    const onSendMessageMock = vi.fn<(message: string) => void>();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    const input = screen.getByLabelText("Message");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(onSendMessageMock).not.toHaveBeenCalled();
  });

  test("should not call onSendMessage if Ctrl+Enter is pressed with an empty message", () => {
    const onSendMessageMock = vi.fn<(message: string) => void>();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    const input = screen.getByLabelText("Message");
    fireEvent.keyDown(input, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
      ctrlKey: true,
    });

    expect(onSendMessageMock).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
  });

  test("should send message when send button is clicked", () => {
    const onSendMessageMock = vi.fn<(message: string) => void>();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello via button" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSendMessageMock).toHaveBeenCalledWith("Hello via button");
  });

  test.each([
    ["", "Enter a message before sending."],
    [" \t\n", "Enter a message before sending."],
    [" ".repeat(32_001), "Enter a message before sending."],
    ["x".repeat(32_001), "Message is too long (max 32,000 characters)."],
  ])(
    "rejects invalid input (case %#) with the matching error",
    (message, error) => {
      const onSendMessageMock = vi.fn<(message: string) => void>();
      render(<ChatInput onSendMessage={onSendMessageMock} />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: message },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(onSendMessageMock).not.toHaveBeenCalled();
      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(screen.getByRole("textbox")).toHaveAccessibleDescription(error);
      expect(screen.getByRole("textbox")).toHaveFocus();
    },
  );

  test("clears empty-submit validation when the user starts typing", () => {
    const onSendMessageMock = vi.fn<(message: string) => void>();
    render(<ChatInput onSendMessage={onSendMessageMock} />);

    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });

    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  test("send button is disabled when disabled prop is true", () => {
    const onSendMessageMock = vi.fn<(message: string) => void>();
    render(
      <ChatInput
        onSendMessage={onSendMessageMock}
        disabled
      />,
    );

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  test("stops generation without submitting another message", () => {
    const onStop = vi.fn<() => void>();
    const onSendMessage = vi.fn<(message: string) => void>();
    render(
      <ChatInput
        disabled
        onSendMessage={onSendMessage}
        onStop={onStop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop generating" }));
    expect(onStop).toHaveBeenCalledOnce();
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  test("does not submit a disabled composer through its form", () => {
    const onSendMessage = vi.fn<(message: string) => void>();
    const { rerender } = render(<ChatInput onSendMessage={onSendMessage} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Hello" },
    });
    rerender(
      <ChatInput
        disabled
        onSendMessage={onSendMessage}
      />,
    );
    // Submit events bubble from the field to the enclosing form.
    fireEvent.submit(screen.getByRole("textbox"));
    expect(onSendMessage).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("Hello");
  });

  test("does not send while composing with an input method editor", () => {
    const onSendMessage = vi.fn<(message: string) => void>();
    render(<ChatInput onSendMessage={onSendMessage} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "こんにちは" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      ctrlKey: true,
      isComposing: true,
    });
    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
