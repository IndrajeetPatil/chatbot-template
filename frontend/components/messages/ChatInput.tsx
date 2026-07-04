import SendIcon from "@mui/icons-material/Send";
import { Box, Button, CircularProgress, TextField } from "@mui/material";
import type React from "react";
import { type KeyboardEvent, useRef, useState } from "react";
import {
  ChatMessageTextSchema,
  MAX_MESSAGE_CHARS,
} from "@/client/chatConstants";

interface ChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  disabled?: boolean;
}

const EMPTY_MESSAGE_ERROR = "Enter a message before sending.";
const TOO_LONG_MESSAGE_ERROR = `Message is too long (max ${MAX_MESSAGE_CHARS.toLocaleString("en-US")} characters).`;

const CHAT_INPUT_FORM_SX = {
  alignItems: "flex-start",
  display: "flex",
  gap: 1,
  mt: 2,
} as const;

const CHAT_INPUT_FIELD_SX = { flexGrow: 1 } as const;

const CHAT_INPUT_SEND_BUTTON_SX = {
  minHeight: 56,
  mt: 2,
  touchAction: "manipulation",
} as const;

function SendButton({ disabled }: { disabled: boolean }) {
  return (
    <Button
      type="submit"
      variant="contained"
      disabled={disabled}
      endIcon={
        disabled ? (
          <CircularProgress
            aria-hidden={true}
            color="inherit"
            size={16}
          />
        ) : (
          <SendIcon />
        )
      }
      sx={CHAT_INPUT_SEND_BUTTON_SX}
    >
      Send
    </Button>
  );
}

interface MessageFieldProps {
  inputRef: React.Ref<HTMLTextAreaElement>;
  disabled: boolean;
  message: string;
  validationError: string | null;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

function MessageField({
  inputRef,
  disabled,
  message,
  validationError,
  onChange,
  onKeyDown,
}: MessageFieldProps) {
  return (
    <TextField
      id="message-input"
      inputRef={inputRef}
      multiline={true}
      fullWidth={true}
      disabled={disabled}
      label="Message"
      name="message"
      autoComplete="off"
      placeholder="Type your message…"
      rows={2}
      value={message}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      error={validationError !== null}
      helperText={
        validationError ??
        "Press Enter for a new line. Press Ctrl+Enter or Cmd+Enter to send."
      }
      sx={CHAT_INPUT_FIELD_SX}
    />
  );
}

function ChatInput({ disabled = false, onSendMessage }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const sendMessage = async () => {
    // Same rule the server enforces, checked here for instant UX feedback.
    const result = ChatMessageTextSchema.safeParse(message);

    if (!result.success) {
      setValidationError(
        message.trim().length === 0
          ? EMPTY_MESSAGE_ERROR
          : TOO_LONG_MESSAGE_ERROR,
      );
      inputRef.current?.focus();
      return;
    }

    setValidationError(null);
    setMessage("");
    await onSendMessage(result.data);
  };

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        void sendMessage();
      }}
      sx={CHAT_INPUT_FORM_SX}
    >
      <MessageField
        inputRef={inputRef}
        disabled={disabled}
        message={message}
        validationError={validationError}
        onChange={(value) => {
          setMessage(value);
          if (validationError !== null) setValidationError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void sendMessage();
          }
        }}
      />
      <SendButton disabled={disabled} />
    </Box>
  );
}

export default ChatInput;
