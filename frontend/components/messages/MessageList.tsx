import type { UIMessage } from "@ai-sdk/react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import type { TextUIPart } from "ai";
import { isTextUIPart } from "ai";
import { INITIAL_MESSAGE_ID } from "@/client/chatConstants";
import AssistantMessage from "@/components/messages/AssistantMessage";
import UserMessage from "@/components/messages/UserMessage";

function renderMessage(message: UIMessage) {
  const content = message.parts
    .filter((part): part is TextUIPart => {
      if (!isTextUIPart(part)) {
        console.warn(
          `[MessageList] Unexpected non-text message part type: "${part.type}"`,
        );
        return false;
      }
      return true;
    })
    .map((part) => part.text)
    .join("");

  return message.role === "user" ? (
    <UserMessage
      key={message.id}
      content={content}
    />
  ) : (
    <AssistantMessage
      key={message.id}
      content={content}
      isFirstMessage={message.id === INITIAL_MESSAGE_ID}
    />
  );
}

interface MessageListProps {
  messages: UIMessage[];
  assistantIsLoading: boolean;
  error: Error | undefined;
}

function MessageList({
  messages,
  assistantIsLoading,
  error,
}: MessageListProps) {
  return (
    <Box
      component="section"
      aria-label="Chat conversation"
      sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}
    >
      <Stack spacing={2}>
        {messages.map(renderMessage)}
        {assistantIsLoading && (
          <Stack
            aria-live="polite"
            direction="row"
            role="status"
            spacing={1}
            sx={{ alignItems: "center" }}
          >
            <CircularProgress
              aria-hidden={true}
              size={20}
            />
            <Typography variant="body2">Generating…</Typography>
          </Stack>
        )}
        {error && (
          <Alert severity="error">
            Something went wrong. Try sending your message again. Details:{" "}
            {error.message}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}

export default MessageList;
