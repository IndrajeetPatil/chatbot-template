import { Box, Container, CssBaseline, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
import { useState } from "react";
import { theme } from "@/client/theme";
import { AssistantModel, AssistantTemperature } from "@/client/types/assistant";
import { useChatSetup } from "@/client/useChatSetup";
import ControlPanel from "@/components/ControlPanel";
import MessageList from "@/components/messages/MessageList";

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

const CHAT_MAIN_SX = {
  display: "flex",
  flexDirection: "column",
  height: "100dvh",
  minHeight: 0,
} as const;

export default function Home() {
  const [model, setModel] = useState<AssistantModel>(AssistantModel.FULL);
  const [temperature, setTemperature] = useState<AssistantTemperature>(
    AssistantTemperature.BALANCED,
  );
  const {
    messages,
    assistantIsLoading,
    hasUserMessage,
    error,
    handleSendMessage,
    handleRegenerateResponse,
  } = useChatSetup(model, temperature);

  return (
    <ThemeProvider
      theme={theme}
      noSsr={true}
    >
      <CssBaseline enableColorScheme={true} />
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
        sx={CHAT_MAIN_SX}
      >
        <Typography
          component="h1"
          sx={visuallyHidden}
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
          disabled={assistantIsLoading}
          onSendMessage={handleSendMessage}
        />
      </Container>
    </ThemeProvider>
  );
}
