import { renderHook } from "@testing-library/react";
import { vi } from "vitest";

const { mockSendMessage, mockRegenerate, mockUseChat } = vi.hoisted(() => ({
  mockSendMessage: vi.fn().mockResolvedValue(undefined),
  mockRegenerate: vi.fn().mockResolvedValue(undefined),
  mockUseChat: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: mockUseChat,
}));

vi.mock("ai", () => ({
  TextStreamChatTransport: class {},
}));

import { makeTextMessage } from "@/client/testUtils";
import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";
import { useChatSetup } from "./useChatSetup";

const INITIAL_MESSAGES = [
  makeTextMessage(
    "initial-message",
    "assistant",
    "Hi, I am a chat bot. How can I help you today?",
  ),
];

const WITH_USER_MESSAGE = [
  ...INITIAL_MESSAGES,
  makeTextMessage("u1", "user", "Hi"),
];

function setupMockChat(
  overrides: Partial<{
    messages: unknown[];
    status: string;
  }> = {},
) {
  mockUseChat.mockReturnValue({
    messages: INITIAL_MESSAGES,
    sendMessage: mockSendMessage,
    regenerate: mockRegenerate,
    error: undefined,
    status: "idle",
    ...overrides,
  });
}

describe("useChatSetup", () => {
  beforeEach(() => {
    setupMockChat();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns messages from useChat", () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.messages).toEqual(INITIAL_MESSAGES);
  });

  test("assistantIsLoading is true when status is submitted", () => {
    setupMockChat({ status: "submitted" });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.assistantIsLoading).toBe(true);
  });

  test("assistantIsLoading is true when status is streaming", () => {
    setupMockChat({ status: "streaming" });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.assistantIsLoading).toBe(true);
  });

  test("assistantIsLoading is false when status is idle", () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.assistantIsLoading).toBe(false);
  });

  test("hasUserMessage is false with only the initial assistant message", () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.hasUserMessage).toBe(false);
  });

  test("hasUserMessage is true when a user message is present", () => {
    setupMockChat({ messages: WITH_USER_MESSAGE });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.hasUserMessage).toBe(true);
  });

  test("handleSendMessage calls sendMessage with text and model/reasoningEffort body", async () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    await result.current.handleSendMessage("hello");
    expect(mockSendMessage).toHaveBeenCalledWith(
      { text: "hello" },
      {
        body: {
          model: AssistantModel.ASTRA,
          reasoning_effort: ReasoningEffort.MEDIUM,
        },
      },
    );
  });

  test("handleRegenerateResponse calls regenerate when user message exists", async () => {
    setupMockChat({ messages: WITH_USER_MESSAGE });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    await result.current.handleRegenerateResponse();
    expect(mockRegenerate).toHaveBeenCalledWith({
      body: {
        model: AssistantModel.ASTRA,
        reasoning_effort: ReasoningEffort.MEDIUM,
      },
    });
  });

  test("handleRegenerateResponse does not call regenerate without user messages", async () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    await result.current.handleRegenerateResponse();
    expect(mockRegenerate).not.toHaveBeenCalled();
  });
});
