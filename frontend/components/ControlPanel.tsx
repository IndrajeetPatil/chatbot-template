import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RefreshIcon from "@mui/icons-material/Refresh";
import TuneIcon from "@mui/icons-material/Tune";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { getModelDisplay, getReasoningEffortDisplay } from "@/client/helpers";
import { AssistantModel, ReasoningEffort } from "@/client/types/assistant";
import ChatInput from "@/components/messages/ChatInput";
import DropdownParameter from "@/components/parameters/DropdownParameter";

const MODEL_OPTIONS = Object.values(AssistantModel).map((value) => ({
  value,
  label: getModelDisplay(value),
}));

const REASONING_EFFORT_OPTIONS = Object.values(ReasoningEffort).map(
  (value) => ({ value, label: getReasoningEffortDisplay(value) }),
);

function DarkModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const isDark = (mode === "system" ? systemMode : mode) === "dark";

  return (
    <Tooltip title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
      <IconButton
        onClick={() => setMode(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

interface RegenerateButtonProps {
  disabled: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
}

function RegenerateButton({
  disabled,
  canRegenerate,
  onRegenerate,
}: RegenerateButtonProps) {
  return (
    <Tooltip
      title="Regenerate Response"
      describeChild={true}
    >
      <span>
        <IconButton
          disabled={disabled || !canRegenerate}
          onClick={onRegenerate}
          aria-label="Regenerate response"
        >
          <RefreshIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

interface ToolbarProps {
  model: AssistantModel;
  setModel: (m: AssistantModel) => void;
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (t: ReasoningEffort) => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
  disabled: boolean;
}

function Toolbar({
  model,
  setModel,
  reasoningEffort,
  setReasoningEffort,
  onRegenerate,
  canRegenerate,
  disabled,
}: ToolbarProps) {
  return (
    <Stack
      direction="row"
      sx={{
        gap: 0.5,
        flexWrap: "wrap",
        alignItems: "center",
        borderTop: 1,
        borderColor: "divider",
        px: 1,
        py: 0.5,
      }}
    >
      <DropdownParameter
        value={model}
        onChange={setModel}
        icon={<PsychologyIcon />}
        ariaLabel={`Select assistant model. Current model: ${getModelDisplay(model)}`}
        options={MODEL_OPTIONS}
        label={getModelDisplay(model)}
      />
      <DropdownParameter
        value={reasoningEffort}
        onChange={setReasoningEffort}
        icon={<TuneIcon />}
        ariaLabel={`Select reasoning effort. Current effort: ${getReasoningEffortDisplay(reasoningEffort)} reasoning`}
        options={REASONING_EFFORT_OPTIONS}
        label={`${getReasoningEffortDisplay(reasoningEffort)} reasoning`}
      />
      <Box sx={{ display: "flex", ml: "auto" }}>
        <RegenerateButton
          disabled={disabled}
          canRegenerate={canRegenerate}
          onRegenerate={onRegenerate}
        />
        <DarkModeToggle />
      </Box>
    </Stack>
  );
}

interface ControlPanelProps extends ToolbarProps {
  onSendMessage: (message: string) => Promise<void>;
  onStop: () => void;
}

function ControlPanel({
  onSendMessage,
  disabled,
  onStop,
  ...toolbarProps
}: ControlPanelProps) {
  return (
    <Box sx={{ pt: 2, pb: "max(16px, env(safe-area-inset-bottom))" }}>
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
          boxShadow: "0 8px 32px rgb(0 0 0 / 4%)",
          "&:focus-within": { borderColor: "primary.main" },
        }}
      >
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={disabled}
          onStop={onStop}
        />
        <Toolbar
          {...toolbarProps}
          disabled={disabled}
        />
      </Box>
      <Typography
        component="p"
        variant="caption"
        sx={{ color: "text.secondary", textAlign: "center", mt: 1.5 }}
      >
        AI can make mistakes. Double-check important details.
      </Typography>
    </Box>
  );
}

export default ControlPanel;
