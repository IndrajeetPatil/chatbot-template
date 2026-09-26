import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { lazy, Suspense, useRef, useState } from "react";
import type { ReactElement } from "react";

// Keep Markdown, highlighting, KaTeX and their styles off the initial path.
const RichMarkdown = lazy(async () => import("./RichMarkdown"));

const COPIED_FEEDBACK_MS = 2000;

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

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The clipboard can be unavailable or denied; the button stays usable.
  }
}

function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    void copyToClipboard(content);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setCopied(true);
    timerRef.current = setTimeout(() => {
      setCopied(false);
    }, COPIED_FEEDBACK_MS);
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

function AssistantMessage({
  content,
  isFirstMessage,
}: AssistantMessageProps): ReactElement {
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
