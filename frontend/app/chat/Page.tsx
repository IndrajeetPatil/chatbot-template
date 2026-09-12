import { Box, Container, CssBaseline, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import { theme } from "@/client/theme";
import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";
import { useChatSetup } from "@/client/useChatSetup";
import ControlPanel from "@/components/ControlPanel";
import MessageList from "@/components/messages/MessageList";
import Welcome from "@/components/Welcome";

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
  maxWidth: "920px",
  px: { xs: 2, sm: 4 },
} as const;

export default function Home() {
  const [model, setModel] = useState<AssistantModel>(AssistantModel.ASTRA);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
    ReasoningEffort.LOW,
  );
  const {
    messages,
    assistantIsLoading,
    hasUserMessage,
    error,
    handleSendMessage,
    handleRegenerateResponse,
    stop,
  } = useChatSetup(model, reasoningEffort);

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
        maxWidth={false}
        sx={CHAT_MAIN_SX}
      >
        <Box
          component="header"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            py: 3,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontSize: "0.95rem",
              fontWeight: 600,
              letterSpacing: "-0.025em",
            }}
          >
            Chatbot Template
            <Box
              component="span"
              aria-hidden={true}
              sx={{ color: "primary.main", ml: 0.5 }}
            >
              ↗
            </Box>
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            Space to think.
          </Typography>
        </Box>
        <MessageList
          messages={messages}
          assistantIsLoading={assistantIsLoading}
          error={error}
          welcome={
            !hasUserMessage ? (
              <Welcome onSendMessage={handleSendMessage} />
            ) : undefined
          }
        />
        <ControlPanel
          model={model}
          setModel={setModel}
          reasoningEffort={reasoningEffort}
          setReasoningEffort={setReasoningEffort}
          onRegenerate={handleRegenerateResponse}
          canRegenerate={hasUserMessage}
          disabled={assistantIsLoading}
          onSendMessage={handleSendMessage}
          onStop={stop}
        />
      </Container>
    </ThemeProvider>
  );
}
