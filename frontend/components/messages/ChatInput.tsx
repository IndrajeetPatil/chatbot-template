import SendIcon from "@mui/icons-material/Send";
import { Box, Button, CircularProgress, TextField } from "@mui/material";
import type React from "react";
import { type KeyboardEvent, useRef, useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void | Promise<void>;
  disabled?: boolean;
}

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
  submittedEmpty: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

function MessageField({
  inputRef,
  disabled,
  message,
  submittedEmpty,
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
      error={submittedEmpty}
      helperText={
        submittedEmpty
          ? "Enter a message before sending."
          : "Press Enter for a new line. Press Ctrl+Enter or Cmd+Enter to send."
      }
      sx={CHAT_INPUT_FIELD_SX}
    />
  );
}

function ChatInput({ disabled = false, onSendMessage }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [message, setMessage] = useState("");
  const [submittedEmpty, setSubmittedEmpty] = useState(false);

  const sendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setSubmittedEmpty(true);
      inputRef.current?.focus();
      return;
    }

    setSubmittedEmpty(false);
    setMessage("");
    await onSendMessage(trimmedMessage);
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
        submittedEmpty={submittedEmpty}
        onChange={(value) => {
          setMessage(value);
          if (submittedEmpty) setSubmittedEmpty(false);
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
