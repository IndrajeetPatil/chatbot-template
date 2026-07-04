import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import type React from "react";
import { lazy, Suspense, useRef, useState } from "react";
import { useIsDark } from "@/client/hooks";

// Load the markdown renderer lazily so it stays off the initial critical
// path. The first paint (including the LCP greeting) renders the message
// text as-is via the Suspense fallback, then upgrades to rendered markdown
// once the chunk arrives — visually identical for plain text, so no layout
// shift.
const ReactMarkdown = lazy(() => import("react-markdown"));

const DARK_COLORS = {
  codeBlock: "#1e1e1e",
  inlineBg: "#2d2d2d",
  inlineFg: "#e0e0e0",
  paper: "#2d2d2d",
  icon: "#4caf50",
} as const;

const LIGHT_COLORS = {
  codeBlock: "#f6f8fa",
  inlineBg: "#f5f5f5",
  inlineFg: "inherit",
  paper: "#fff3e0",
  icon: "#ff9800",
} as const;

const COPY_BTN_COLORS = {
  dark: { bg: "#4caf50", hover: "#45a049" },
  light: { bg: "#ff9800", hover: "#e65100" },
} as const;

const BLOCK_CODE_SX = {
  fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: "0.875rem",
  whiteSpace: "pre",
} as const;

const COPY_BUTTON_SX = {
  position: "absolute",
  right: 4,
  top: 4,
} as const;

const CODE_BLOCK_PRE_SX = {
  borderRadius: 1,
  mt: 2,
  overflowX: "auto",
  p: 2,
} as const;

// Paragraphs get spacing between them, but the outer edges collapse so a
// single-paragraph message (e.g. the greeting) renders with no vertical
// margin — matching the raw-text Suspense fallback exactly, so upgrading to
// rendered markdown causes no layout shift.
const MARKDOWN_P_SX = {
  my: 2,
  "&:first-of-type": { mt: 0 },
  "&:last-of-type": { mb: 0 },
} as const;

const ASSISTANT_MESSAGE_CONTAINER_SX = {
  display: "flex",
  justifyContent: "flex-start",
} as const;

const ASSISTANT_MESSAGE_PAPER_SX = {
  maxWidth: "80%",
  overflowWrap: "anywhere",
  p: 2,
  position: "relative",
  wordWrap: "break-word",
} as const;

function BlockCode({ text }: { text: string }) {
  return (
    <Typography
      component="code"
      sx={BLOCK_CODE_SX}
    >
      {text.replace(/\n$/, "")}
    </Typography>
  );
}

interface CopyButtonProps {
  content: string;
  isDark: boolean;
}

function CopyButton({ content, isDark }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnColors = isDark ? COPY_BTN_COLORS.dark : COPY_BTN_COLORS.light;

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
        sx={[
          COPY_BUTTON_SX,
          {
            "&:hover": { backgroundColor: btnColors.hover },
            backgroundColor: btnColors.bg,
          },
        ]}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

type ThemeColors = typeof DARK_COLORS | typeof LIGHT_COLORS;

// The React Compiler memoizes this object by its `colors` dependency, so no
// manual useMemo is needed to keep the reference stable across renders.
function useMarkdownComponents(colors: ThemeColors) {
  return {
    p: ({ children }: React.ComponentPropsWithoutRef<"p">) => (
      <Box
        component="p"
        sx={MARKDOWN_P_SX}
      >
        {children}
      </Box>
    ),
    pre: ({ children }: React.ComponentPropsWithoutRef<"pre">) => (
      <Box
        component="pre"
        data-testid="code-block"
        sx={[CODE_BLOCK_PRE_SX, { backgroundColor: colors.codeBlock }]}
      >
        {children}
      </Box>
    ),
    code: ({
      className = "",
      children,
    }: React.ComponentPropsWithoutRef<"code">) => {
      const language = className.match(/language-(\w+)/)?.[1];
      const text = String(children ?? "");
      if (language || text.includes("\n")) {
        return <BlockCode text={text} />;
      }
      return (
        <code
          style={{ backgroundColor: colors.inlineBg, color: colors.inlineFg }}
        >
          {children}
        </code>
      );
    },
  };
}

interface AssistantMessageProps {
  content: string;
  isFirstMessage: boolean;
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({
  content,
  isFirstMessage,
}) => {
  const isDark = useIsDark();
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const markdownComponents = useMarkdownComponents(colors);

  return (
    <Box sx={ASSISTANT_MESSAGE_CONTAINER_SX}>
      <Paper
        elevation={2}
        sx={[ASSISTANT_MESSAGE_PAPER_SX, { backgroundColor: colors.paper }]}
      >
        <SmartToyIcon sx={{ color: colors.icon }} />
        <Typography
          variant="body1"
          component="div"
        >
          <Suspense fallback={content}>
            <ReactMarkdown components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </Suspense>
        </Typography>
        {!isFirstMessage && (
          <CopyButton
            content={content}
            isDark={isDark}
          />
        )}
      </Paper>
    </Box>
  );
};

export default AssistantMessage;
