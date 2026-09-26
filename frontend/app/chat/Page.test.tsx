import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";
import type { useChatSetup } from "@/client/useChatSetup";

import Home from "./Page";

type ChatSetup = ReturnType<typeof useChatSetup>;

const { mockUseChatSetup, send, regenerate } = vi.hoisted(() => ({
  mockUseChatSetup: vi.fn<typeof useChatSetup>(),
  send: vi.fn<ChatSetup["handleSendMessage"]>().mockResolvedValue(undefined),
  regenerate: vi
    .fn<ChatSetup["handleRegenerateResponse"]>()
    .mockResolvedValue(undefined),
}));

vi.mock(import("@/client/useChatSetup"), () => ({
  useChatSetup: mockUseChatSetup,
}));

function setupChat({ hasUserMessage }: Pick<ChatSetup, "hasUserMessage">) {
  mockUseChatSetup.mockReturnValue({
    messages: [],
    assistantIsLoading: false,
    hasUserMessage,
    error: undefined,
    handleSendMessage: send,
    handleRegenerateResponse: regenerate,
    stop: vi.fn<ChatSetup["stop"]>(),
  });
}

beforeEach(() => {
  setupChat({ hasUserMessage: true });
});

test("connects model, reasoning, send and regeneration to the chat hook", () => {
  render(<Home />);
  expect(mockUseChatSetup).toHaveBeenLastCalledWith(
    AssistantModel.ASTRA,
    ReasoningEffort.LOW,
  );

  fireEvent.click(
    screen.getByRole("button", { name: /Select assistant model/u }),
  );
  fireEvent.click(screen.getAllByRole("menuitem")[1]);
  fireEvent.click(
    screen.getByRole("button", { name: /Select reasoning effort/u }),
  );
  fireEvent.click(screen.getAllByRole("menuitem")[2]);
  expect(mockUseChatSetup).toHaveBeenLastCalledWith(
    AssistantModel.SOL,
    ReasoningEffort.HIGH,
  );

  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(send).toHaveBeenCalledWith("Hello");
  fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));
  expect(regenerate).toHaveBeenCalledExactlyOnceWith();
});

test("exposes navigation landmarks and connects the skip link to the composer", () => {
  render(<Home />);
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    `#${screen.getByRole("textbox").id}`,
  );
});

test("starts a conversation from a suggested prompt", () => {
  setupChat({ hasUserMessage: false });
  render(<Home />);
  fireEvent.click(
    screen.getByRole("button", { name: /Explain a complex idea/u }),
  );
  expect(send).toHaveBeenCalledWith("Explain a complex idea in simple terms.");
});
