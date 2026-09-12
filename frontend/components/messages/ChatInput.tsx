import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import StopIcon from "@mui/icons-material/Stop";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import type React from "react";
import { type KeyboardEvent, useRef, useState } from "react";
import {
  ChatMessageTextSchema,
  MAX_MESSAGE_CHARS,
} from "@/client/chatConstants";

interface ChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  disabled?: boolean;
  onStop?: () => void;
}

const EMPTY_MESSAGE_ERROR = "Enter a message before sending.";
const TOO_LONG_MESSAGE_ERROR = `Message is too long (max ${MAX_MESSAGE_CHARS.toLocaleString("en-US")} characters).`;

function getMessageError(message: string) {
  return message.trim().length === 0
    ? EMPTY_MESSAGE_ERROR
    : TOO_LONG_MESSAGE_ERROR;
}

const CHAT_INPUT_FORM_SX = {
  alignItems: "flex-end",
  display: "flex",
  gap: 1,
  p: 2,
} as const;

const CHAT_INPUT_FIELD_SX = {
  flexGrow: 1,
  "& .MuiInputBase-root": { p: 0 },
  "& .MuiInputBase-input::placeholder": { color: "text.secondary", opacity: 1 },
  "& .MuiFormHelperText-root": { mx: 0, mt: 1.5, fontSize: "0.7rem" },
} as const;

const CHAT_INPUT_SEND_BUTTON_SX = {
  mb: 3.5,
  color: "primary.contrastText",
  bgcolor: "primary.main",
  borderRadius: 2,
  "&:hover": { bgcolor: "primary.dark" },
  touchAction: "manipulation",
} as const;

function SendButton({
  disabled,
  onStop,
}: Pick<ChatInputProps, "onStop"> & { disabled: boolean }) {
  if (disabled && onStop) {
    return (
      <Tooltip title="Stop generating">
        <IconButton
          type="button"
          aria-label="Stop generating"
          onClick={onStop}
          sx={CHAT_INPUT_SEND_BUTTON_SX}
        >
          <StopIcon />
        </IconButton>
      </Tooltip>
    );
  }
  return (
    <Tooltip title="Send message">
      <IconButton
        type="submit"
        aria-label="Send"
        disabled={disabled}
        sx={CHAT_INPUT_SEND_BUTTON_SX}
      >
        <ArrowUpwardIcon />
      </IconButton>
    </Tooltip>
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
      variant="standard"
      slotProps={{
        input: { disableUnderline: true },
        htmlInput: { "aria-label": "Message" },
      }}
      name="message"
      autoComplete="off"
      placeholder="Ask anything, or think out loud…"
      minRows={2}
      maxRows={6}
      value={message}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      error={validationError !== null}
      helperText={
        validationError ?? "Enter for a new line · Ctrl / ⌘ + Enter to send"
      }
      sx={CHAT_INPUT_FIELD_SX}
    />
  );
}

function isSendShortcut(event: KeyboardEvent<HTMLDivElement>) {
  return (
    event.key === "Enter" &&
    (event.metaKey || event.ctrlKey) &&
    !event.nativeEvent.isComposing
  );
}

function ChatInput({
  disabled = false,
  onSendMessage,
  onStop,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (disabled) return;
    // Same rule the server enforces, checked here for instant UX feedback.
    const result = ChatMessageTextSchema.safeParse(message);

    if (!result.success) {
      setValidationError(getMessageError(message));
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
          if (isSendShortcut(event)) {
            event.preventDefault();
            void sendMessage();
          }
        }}
      />
      <SendButton
        disabled={disabled}
        onStop={onStop}
      />
    </Box>
  );
}

export default ChatInput;
