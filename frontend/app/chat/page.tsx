"use client";

import { Box, Container, CssBaseline, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import { AssistantModel, AssistantTemperature } from "@/client/types/assistant";
import { useChatSetup } from "@/client/useChatSetup";
import { useDarkMode } from "@/client/useDarkMode";
import ControlPanel from "@/components/ControlPanel";
import MessageList from "@/components/messages/MessageList";

const VISUALLY_HIDDEN_SX = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1,
} as const;

const SKIP_LINK_SX = {
  backgroundColor: "background.paper",
  border: 1,
  borderColor: "primary.main",
  borderRadius: 1,
  boxShadow: 2,
  color: "primary.main",
  left: 16,
  px: 2,
  py: 1,
  position: "absolute",
  top: 16,
  transform: "translateY(-200%)",
  zIndex: "tooltip",
  "&:focus-visible": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: 2,
    transform: "translateY(0)",
  },
} as const;

export default function Home() {
  const [model, setModel] = useState<AssistantModel>(AssistantModel.FULL);
  const [temperature, setTemperature] = useState<AssistantTemperature>(
    AssistantTemperature.BALANCED,
  );
  const { darkMode, theme, toggleDarkMode } = useDarkMode();
  const {
    messages,
    assistantIsLoading,
    hasUserMessage,
    error,
    handleSendMessage,
    handleRegenerateResponse,
  } = useChatSetup(model, temperature);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        href="#message-input"
        component="a"
        sx={SKIP_LINK_SX}
      >
        Skip to Message
      </Box>
      <Container
        id="chat-main"
        component="main"
        maxWidth="md"
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          minHeight: 0,
        }}
      >
        <Typography
          component="h1"
          sx={VISUALLY_HIDDEN_SX}
        >
          Chatbot Template
        </Typography>
        <MessageList
          messages={messages}
          assistantIsLoading={assistantIsLoading}
          error={error}
        />
        <ControlPanel
          model={model}
          setModel={setModel}
          temperature={temperature}
          setTemperature={setTemperature}
          onRegenerate={handleRegenerateResponse}
          canRegenerate={hasUserMessage}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          disabled={assistantIsLoading}
          onSendMessage={handleSendMessage}
        />
      </Container>
    </ThemeProvider>
  );
}
