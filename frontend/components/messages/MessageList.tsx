import type { UIMessage } from "@ai-sdk/react";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { TextUIPart } from "ai";
import { isTextUIPart } from "ai";
import type { ReactNode } from "react";
import { INITIAL_MESSAGE_ID } from "@/client/chatConstants";
import { useConversationScroll } from "@/client/useConversationScroll";
import AssistantMessage from "@/components/messages/AssistantMessage";
import UserMessage from "@/components/messages/UserMessage";

function renderMessage(message: UIMessage) {
  const content = message.parts
    .filter((part): part is TextUIPart => {
      if (!isTextUIPart(part)) {
        if (import.meta.env.DEV) {
          console.warn(
            `[MessageList] Unexpected non-text message part type: "${part.type}"`,
          );
        }
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
  welcome?: ReactNode;
}

function ResponseStatus({
  assistantIsLoading,
  error,
}: Pick<MessageListProps, "assistantIsLoading" | "error">) {
  return (
    <>
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
    </>
  );
}

function MessageList({
  messages,
  assistantIsLoading,
  error,
  welcome,
}: MessageListProps) {
  const {
    viewportRef,
    contentRef,
    onScroll,
    scrollToBottom,
    showScrollButton,
  } = useConversationScroll(!welcome);
  return (
    <Box sx={{ flex: 1, minHeight: 0, position: "relative", display: "flex" }}>
      <Box
        component="section"
        aria-label="Chat conversation"
        tabIndex={0}
        ref={viewportRef}
        onScroll={welcome ? undefined : onScroll}
        sx={{
          width: "100%",
          overflowY: "auto",
          overscrollBehavior: "contain",
          scrollbarWidth: "thin",
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: -2,
          },
        }}
      >
        <Stack
          ref={contentRef}
          spacing={3}
          sx={{ minHeight: "100%", py: 3, px: 1 }}
        >
          {welcome ?? (
            <Stack
              spacing={3}
              aria-live="polite"
              aria-busy={assistantIsLoading}
            >
              {messages
                .filter((message) => message.id !== INITIAL_MESSAGE_ID)
                .map(renderMessage)}
            </Stack>
          )}
          <ResponseStatus
            assistantIsLoading={assistantIsLoading}
            error={error}
          />
        </Stack>
      </Box>
      {showScrollButton && (
        <Button
          variant="contained"
          startIcon={<ArrowDownwardIcon />}
          onClick={scrollToBottom}
          sx={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            borderRadius: 8,
            minHeight: 44,
          }}
        >
          Jump to latest
        </Button>
      )}
    </Box>
  );
}

export default MessageList;
