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

import { AssistantModel, AssistantTemperature } from "@/client/types/assistant";
import { useChatSetup } from "./useChatSetup";

const INITIAL_MESSAGES = [
  {
    id: "initial-message",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Hi, I am a chat bot. How can I help you today?",
      },
    ],
  },
];

const WITH_USER_MESSAGE = [
  ...INITIAL_MESSAGES,
  {
    id: "u1",
    role: "user" as const,
    parts: [{ type: "text" as const, text: "Hi" }],
  },
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
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    expect(result.current.messages).toEqual(INITIAL_MESSAGES);
  });

  test("assistantIsLoading is true when status is submitted", () => {
    setupMockChat({ status: "submitted" });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    expect(result.current.assistantIsLoading).toBe(true);
  });

  test("assistantIsLoading is true when status is streaming", () => {
    setupMockChat({ status: "streaming" });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    expect(result.current.assistantIsLoading).toBe(true);
  });

  test("assistantIsLoading is false when status is idle", () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    expect(result.current.assistantIsLoading).toBe(false);
  });

  test("hasUserMessage is false with only the initial assistant message", () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    expect(result.current.hasUserMessage).toBe(false);
  });

  test("hasUserMessage is true when a user message is present", () => {
    setupMockChat({ messages: WITH_USER_MESSAGE });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    expect(result.current.hasUserMessage).toBe(true);
  });

  test("handleSendMessage calls sendMessage with text and model/temperature body", async () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    await result.current.handleSendMessage("hello");
    expect(mockSendMessage).toHaveBeenCalledWith(
      { text: "hello" },
      {
        body: {
          model: AssistantModel.FULL,
          temperature: AssistantTemperature.BALANCED,
        },
      },
    );
  });

  test("handleRegenerateResponse calls regenerate when user message exists", async () => {
    setupMockChat({ messages: WITH_USER_MESSAGE });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    await result.current.handleRegenerateResponse();
    expect(mockRegenerate).toHaveBeenCalledWith({
      body: {
        model: AssistantModel.FULL,
        temperature: AssistantTemperature.BALANCED,
      },
    });
  });

  test("handleRegenerateResponse does not call regenerate without user messages", async () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.FULL, AssistantTemperature.BALANCED),
    );
    await result.current.handleRegenerateResponse();
    expect(mockRegenerate).not.toHaveBeenCalled();
  });
});
