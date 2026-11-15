import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { lazy, Suspense, useRef, useState } from "react";
import type { ReactElement } from "react";

// Keep Markdown, highlighting, KaTeX and their styles off the initial path.
const RichMarkdown = lazy(async () => import("./RichMarkdown"));

const COPY_FEEDBACK_MS = 2000;

const COPY_BUTTON_SX = {
  mt: 1,
  ml: -1,
  color: "text.secondary",
} as const;

// Hidden from view but kept in the accessibility tree so updates are announced.
const VISUALLY_HIDDEN_SX = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
} as const;

type CopyResult = "copied" | "failed";

const COPY_FEEDBACK: Record<CopyResult, string> = {
  copied: "Copied",
  failed: "Copy failed",
};

interface CopyButtonProps {
  content: string;
}

async function copyToClipboard(text: string): Promise<CopyResult> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    // The clipboard can be unavailable or denied; report it and stay usable.
    return "failed";
  }
}

function CopyButton({ content }: CopyButtonProps) {
  const [result, setResult] = useState<CopyResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    const outcome = await copyToClipboard(content);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setResult(outcome);
    timerRef.current = setTimeout(() => {
      setResult(null);
    }, COPY_FEEDBACK_MS);
  };

  const feedback = result === null ? "" : COPY_FEEDBACK[result];

  return (
    <>
      <Tooltip title={feedback || "Copy entire message"}>
        <IconButton
          aria-label="Copy entire message"
          onClick={() => {
            void handleCopy();
          }}
          sx={COPY_BUTTON_SX}
        >
          {result === "copied" ? (
            <CheckIcon fontSize="small" />
          ) : (
            <ContentCopyIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
      {/* Outside the button, whose children are presentational, so screen
          readers hear the same outcome the tooltip shows. */}
      <Box
        component="span"
        aria-live="polite"
        sx={VISUALLY_HIDDEN_SX}
      >
        {feedback}
      </Box>
    </>
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
    <Box sx={{ overflowWrap: "break-word" }}>
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
  );
}

export default AssistantMessage;
