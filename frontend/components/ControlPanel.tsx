import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RefreshIcon from "@mui/icons-material/Refresh";
import TuneIcon from "@mui/icons-material/Tune";
import { Box, IconButton, Stack, Tooltip } from "@mui/material";
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
    <Tooltip title="Regenerate Response">
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
      spacing={2}
      sx={{ mb: 2 }}
    >
      <DropdownParameter
        value={model}
        onChange={setModel}
        icon={<PsychologyIcon />}
        tooltipTitle={
          <>
            Choose Assistant Model
            <br />
            (Current: {getModelDisplay(model)})
          </>
        }
        ariaLabel={`Select assistant model. Current model: ${getModelDisplay(model)}`}
        options={MODEL_OPTIONS}
      />
      <DropdownParameter
        value={reasoningEffort}
        onChange={setReasoningEffort}
        icon={<TuneIcon />}
        tooltipTitle={
          <>
            Choose Reasoning Effort
            <br />
            (Current: {getReasoningEffortDisplay(reasoningEffort)})
          </>
        }
        ariaLabel={`Select reasoning effort. Current effort: ${getReasoningEffortDisplay(reasoningEffort)}`}
        options={REASONING_EFFORT_OPTIONS}
      />
      <RegenerateButton
        disabled={disabled}
        canRegenerate={canRegenerate}
        onRegenerate={onRegenerate}
      />
      <DarkModeToggle />
    </Stack>
  );
}

interface ControlPanelProps extends ToolbarProps {
  onSendMessage: (message: string) => Promise<void>;
}

function ControlPanel({
  onSendMessage,
  disabled,
  ...toolbarProps
}: ControlPanelProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Toolbar
        {...toolbarProps}
        disabled={disabled}
      />
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={disabled}
      />
    </Box>
  );
}

export default ControlPanel;
