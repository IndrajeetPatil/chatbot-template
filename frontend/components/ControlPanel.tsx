import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RefreshIcon from "@mui/icons-material/Refresh";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import { Box, IconButton, Stack, Tooltip } from "@mui/material";
import { getModelDisplay, getTemperatureDisplay } from "@/client/helpers";
import { AssistantModel, AssistantTemperature } from "@/client/types/assistant";
import ChatInput from "@/components/messages/ChatInput";
import DropdownParameter from "@/components/parameters/DropdownParameter";

const MODEL_OPTIONS = [
  { value: AssistantModel.FULL, label: "GPT-4o" },
  { value: AssistantModel.MINI, label: "GPT-4o Mini" },
];

const TEMPERATURE_OPTIONS = [
  {
    value: AssistantTemperature.DETERMINISTIC,
    label: "0.2 - More Deterministic",
  },
  { value: AssistantTemperature.BALANCED, label: "0.7 - Balanced" },
  { value: AssistantTemperature.CREATIVE, label: "0.9 - More Creative" },
];

interface DarkModeToggleProps {
  darkMode: boolean;
  onToggle: () => void;
}

function DarkModeToggle({ darkMode, onToggle }: DarkModeToggleProps) {
  return (
    <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
      <IconButton
        onClick={onToggle}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

interface ControlPanelProps {
  model: AssistantModel;
  setModel: (m: AssistantModel) => void;
  temperature: AssistantTemperature;
  setTemperature: (t: AssistantTemperature) => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  disabled: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

function ControlPanel({
  model,
  setModel,
  temperature,
  setTemperature,
  onRegenerate,
  canRegenerate,
  darkMode,
  onToggleDarkMode,
  disabled,
  onSendMessage,
}: ControlPanelProps) {
  return (
    <Box sx={{ p: 2 }}>
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
          value={temperature}
          onChange={setTemperature}
          icon={<ThermostatIcon />}
          tooltipTitle={
            <>
              Choose Temperature
              <br />
              (Current: {getTemperatureDisplay(temperature)})
            </>
          }
          ariaLabel={`Select assistant temperature. Current temperature: ${getTemperatureDisplay(temperature)}`}
          options={TEMPERATURE_OPTIONS}
        />
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
        <DarkModeToggle
          darkMode={darkMode}
          onToggle={onToggleDarkMode}
        />
      </Stack>
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={disabled}
      />
    </Box>
  );
}

export default ControlPanel;
