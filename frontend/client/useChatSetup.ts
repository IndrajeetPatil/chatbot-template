import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { CHAT_API_URL, INITIAL_MESSAGES } from "@/client/chatConstants";
import type {
  AssistantModel,
  AssistantTemperature,
} from "@/client/types/assistant";

const CHAT_TRANSPORT = new TextStreamChatTransport({ api: CHAT_API_URL });

function useChatSetup(
  model: AssistantModel,
  temperature: AssistantTemperature,
) {
  const { messages, sendMessage, regenerate, error, status } = useChat({
    messages: INITIAL_MESSAGES,
    transport: CHAT_TRANSPORT,
    experimental_throttle: 50,
  });
  const assistantIsLoading = status === "submitted" || status === "streaming";
  const hasUserMessage = messages.some((message) => message.role === "user");

  const handleSendMessage = async (message: string) => {
    await sendMessage({ text: message }, { body: { model, temperature } });
  };

  const handleRegenerateResponse = async () => {
    if (hasUserMessage) {
      await regenerate({ body: { model, temperature } });
    }
  };

  return {
    messages,
    assistantIsLoading,
    hasUserMessage,
    error,
    handleSendMessage,
    handleRegenerateResponse,
  };
}

export { useChatSetup };
