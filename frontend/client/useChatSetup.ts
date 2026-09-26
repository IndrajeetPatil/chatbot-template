import { useChat } from "@ai-sdk/react";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";

import { CHAT_API_URL, INITIAL_MESSAGES } from "@/client/chatConstants";
import { toBackendMessages } from "@/client/helpers";
import type { AssistantModel, ReasoningEffort } from "@/client/types/assistant";

const CHAT_TRANSPORT = new TextStreamChatTransport({
  api: CHAT_API_URL,
  prepareSendMessagesRequest: ({ messages, body }) => ({
    body: { ...body, messages: toBackendMessages(messages) },
  }),
});

interface ChatSetup extends Pick<
  UseChatHelpers<UIMessage>,
  "messages" | "error" | "stop"
> {
  assistantIsLoading: boolean;
  hasUserMessage: boolean;
  handleSendMessage: (message: string) => Promise<void>;
  handleRegenerateResponse: () => Promise<void>;
}

function useChatSetup(
  model: AssistantModel,
  reasoningEffort: ReasoningEffort,
): ChatSetup {
  const { messages, sendMessage, regenerate, error, status, stop } = useChat({
    messages: INITIAL_MESSAGES,
    transport: CHAT_TRANSPORT,
    throttle: 50,
  });
  const assistantIsLoading = status === "submitted" || status === "streaming";
  const hasUserMessage = messages.some((message) => message.role === "user");

  const handleSendMessage = async (message: string) => {
    await sendMessage(
      { text: message },
      { body: { model, reasoning_effort: reasoningEffort } },
    );
  };

  const handleRegenerateResponse = async () => {
    if (hasUserMessage) {
      await regenerate({ body: { model, reasoning_effort: reasoningEffort } });
    }
  };

  return {
    messages,
    assistantIsLoading,
    hasUserMessage,
    error,
    handleSendMessage,
    handleRegenerateResponse,
    stop,
  };
}

export { useChatSetup };
