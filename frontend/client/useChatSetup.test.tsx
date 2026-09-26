import { useChat } from "@ai-sdk/react";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { makeTextMessage } from "@/client/testUtils";
import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";

import { useChatSetup } from "./useChatSetup";

type ChatHelpers = UseChatHelpers<UIMessage>;

vi.mock(import("@ai-sdk/react"), { spy: true });

const mockSendMessage = vi
  .fn<ChatHelpers["sendMessage"]>()
  .mockResolvedValue(undefined);
const mockRegenerate = vi
  .fn<ChatHelpers["regenerate"]>()
  .mockResolvedValue(undefined);
const mockStop = vi.fn<ChatHelpers["stop"]>().mockResolvedValue(undefined);

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

function setupMockChat({
  messages = INITIAL_MESSAGES,
  status = "ready",
}: Partial<Pick<ChatHelpers, "messages" | "status">> = {}) {
  vi.mocked(useChat).mockReturnValue({
    id: "chat",
    messages,
    status,
    error: undefined,
    sendMessage: mockSendMessage,
    regenerate: mockRegenerate,
    stop: mockStop,
    setMessages: vi.fn<ChatHelpers["setMessages"]>(),
    resumeStream: vi.fn<ChatHelpers["resumeStream"]>(),
    addToolOutput: vi.fn<ChatHelpers["addToolOutput"]>(),
    // oxlint-disable-next-line typescript/no-deprecated -- UseChatHelpers still requires this member
    addToolResult: vi.fn<ChatHelpers["addToolResult"]>(),
    addToolApprovalResponse: vi.fn<ChatHelpers["addToolApprovalResponse"]>(),
    clearError: vi.fn<ChatHelpers["clearError"]>(),
  });
}

describe(useChatSetup, () => {
  beforeEach(() => {
    setupMockChat();
  });

  test("returns messages from useChat", () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.messages).toStrictEqual(INITIAL_MESSAGES);
  });

  test("stops the AI SDK request", async () => {
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.LOW),
    );
    await result.current.stop();
    expect(mockStop).toHaveBeenCalledExactlyOnceWith();
  });

  test.each([
    ["submitted", true],
    ["streaming", true],
    ["ready", false],
    ["error", false],
  ] as const)("status %s sets assistantIsLoading to %s", (status, expected) => {
    setupMockChat({ status });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.assistantIsLoading).toBe(expected);
  });

  test.each([
    ["only the initial assistant message", INITIAL_MESSAGES, false],
    ["a user message", WITH_USER_MESSAGE, true],
  ])("hasUserMessage with %s is %s", (_case, messages, expected) => {
    setupMockChat({ messages });
    const { result } = renderHook(() =>
      useChatSetup(AssistantModel.ASTRA, ReasoningEffort.MEDIUM),
    );
    expect(result.current.hasUserMessage).toBe(expected);
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
