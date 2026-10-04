import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";
import { useChatSetup } from "@/client/useChatSetup";

import Home from "./Page";

type ChatSetup = ReturnType<typeof useChatSetup>;

vi.mock(import("@/client/useChatSetup"), { spy: true });

const send = vi.fn<ChatSetup["handleSendMessage"]>().mockResolvedValue();
const regenerate = vi
  .fn<ChatSetup["handleRegenerateResponse"]>()
  .mockResolvedValue();

function setupChat({ hasUserMessage }: Pick<ChatSetup, "hasUserMessage">) {
  vi.mocked(useChatSetup).mockReturnValue({
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
  expect(useChatSetup).toHaveBeenLastCalledWith(
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
  expect(useChatSetup).toHaveBeenLastCalledWith(
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
