import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { lazy, Suspense, useRef, useState } from "react";

// Keep Markdown, highlighting, KaTeX and their styles off the initial path.
const RichMarkdown = lazy(() => import("./RichMarkdown"));

const COPY_BUTTON_SX = {
  mt: 1,
  ml: -1,
  color: "text.secondary",
} as const;

const ASSISTANT_MESSAGE_CONTAINER_SX = {
  display: "flex",
  justifyContent: "flex-start",
} as const;

const ASSISTANT_MESSAGE_PAPER_SX = {
  width: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
  wordWrap: "break-word",
} as const;

interface CopyButtonProps {
  content: string;
}

function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    /* v8 ignore next */
    navigator.clipboard.writeText(content).catch(() => {});
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip title={copied ? "Copied!" : "Copy entire message"}>
      <IconButton
        onClick={handleCopy}
        sx={COPY_BUTTON_SX}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

interface AssistantMessageProps {
  content: string;
  isFirstMessage: boolean;
}

function AssistantMessage({ content, isFirstMessage }: AssistantMessageProps) {
  return (
    <Box sx={ASSISTANT_MESSAGE_CONTAINER_SX}>
      <Box sx={ASSISTANT_MESSAGE_PAPER_SX}>
        <Typography
          component="div"
          variant="caption"
          sx={{ color: "primary.main", fontWeight: 600, mb: 1.5 }}
        >
          Assistant
        </Typography>
        <Typography
          variant="body1"
          component="div"
        >
          <Suspense fallback={content}>
            <RichMarkdown content={content} />
          </Suspense>
        </Typography>
        {!isFirstMessage && <CopyButton content={content} />}
      </Box>
    </Box>
  );
}

export default AssistantMessage;
