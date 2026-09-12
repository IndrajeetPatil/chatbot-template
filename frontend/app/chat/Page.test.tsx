import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";

const { mockUseChatSetup, send, regenerate } = vi.hoisted(() => ({
  mockUseChatSetup: vi.fn(),
  send: vi.fn().mockResolvedValue(undefined),
  regenerate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/client/useChatSetup", () => ({ useChatSetup: mockUseChatSetup }));

import Home from "./Page";

beforeEach(() => {
  mockUseChatSetup.mockReturnValue({
    messages: [],
    assistantIsLoading: false,
    hasUserMessage: true,
    handleSendMessage: send,
    handleRegenerateResponse: regenerate,
  });
});

test("connects model, reasoning, send and regeneration to the chat hook", () => {
  render(<Home />);
  expect(mockUseChatSetup).toHaveBeenLastCalledWith(
    AssistantModel.ASTRA,
    ReasoningEffort.LOW,
  );

  fireEvent.click(
    screen.getByRole("button", { name: /Select assistant model/ }),
  );
  fireEvent.click(screen.getAllByRole("menuitem")[1]);
  fireEvent.click(
    screen.getByRole("button", { name: /Select reasoning effort/ }),
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
  expect(regenerate).toHaveBeenCalledOnce();
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
  mockUseChatSetup.mockReturnValue({
    messages: [],
    assistantIsLoading: false,
    hasUserMessage: false,
    handleSendMessage: send,
  });
  render(<Home />);
  fireEvent.click(
    screen.getByRole("button", { name: /Explain a complex idea/ }),
  );
  expect(send).toHaveBeenCalledWith("Explain a complex idea in simple terms.");
});
