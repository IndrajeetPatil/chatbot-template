import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

// Hoist mock functions so they can be used inside vi.mock factories
const {
  mockUseChatSetup,
  mockHandleSendMessage,
  mockHandleRegenerateResponse,
} = vi.hoisted(() => ({
  mockUseChatSetup: vi.fn(),
  mockHandleSendMessage: vi.fn().mockResolvedValue(undefined),
  mockHandleRegenerateResponse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/client/useChatSetup", () => ({
  useChatSetup: mockUseChatSetup,
}));

// Mock extracted components so we can test page.tsx logic in isolation
vi.mock("@/components/messages/MessageList", () => ({
  default: ({
    messages,
    assistantIsLoading,
    error,
  }: {
    messages: unknown[];
    assistantIsLoading: boolean;
    error: Error | undefined;
  }) => (
    <div
      data-testid="message-list"
      data-loading={String(assistantIsLoading)}
      data-error={error?.message ?? ""}
      data-message-count={String(messages.length)}
    />
  ),
}));

vi.mock("@/components/ControlPanel", () => ({
  default: ({
    model,
    temperature,
    canRegenerate,
    disabled,
    setModel,
    setTemperature,
    onRegenerate,
    onSendMessage,
  }: {
    model: string;
    temperature: string;
    canRegenerate: boolean;
    disabled: boolean;
    setModel: (m: string) => void;
    setTemperature: (t: string) => void;
    onRegenerate: () => void;
    onSendMessage: (msg: string) => Promise<void>;
  }) => (
    <div data-testid="control-panel">
      <span data-testid="cp-model">{model}</span>
      <span data-testid="cp-temperature">{temperature}</span>
      <span data-testid="cp-can-regenerate">{String(canRegenerate)}</span>
      <span data-testid="cp-disabled">{String(disabled)}</span>
      <button
        type="button"
        data-testid="cp-set-model"
        onClick={() => setModel("gpt-4o-mini")}
      >
        Set Model
      </button>
      <button
        type="button"
        data-testid="cp-set-temperature"
        onClick={() => setTemperature("CREATIVE")}
      >
        Set Temp
      </button>
      <button
        type="button"
        data-testid="cp-regenerate"
        onClick={onRegenerate}
      >
        Regenerate
      </button>
      <button
        type="button"
        data-testid="cp-send"
        onClick={() => void onSendMessage("hi")}
      >
        Send
      </button>
    </div>
  ),
}));

import { makeTextMessage } from "@/client/test-utils";
import { AssistantModel, AssistantTemperature } from "@/client/types/assistant";
import Home from "./page";

const INITIAL_MESSAGES = [
  makeTextMessage("initial-message", "assistant", "Hi, I am a chat bot."),
];

function setupMocks(
  overrides: Partial<{
    messages: typeof INITIAL_MESSAGES;
    assistantIsLoading: boolean;
    hasUserMessage: boolean;
    error: Error | undefined;
  }> = {},
) {
  const {
    messages = INITIAL_MESSAGES,
    assistantIsLoading = false,
    hasUserMessage = false,
    error = undefined,
  } = overrides;

  mockUseChatSetup.mockReturnValue({
    messages,
    assistantIsLoading,
    hasUserMessage,
    error,
    handleSendMessage: mockHandleSendMessage,
    handleRegenerateResponse: mockHandleRegenerateResponse,
  });
}

describe("Home page", () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders main landmark, page heading, and skip link", () => {
    render(<Home />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Chatbot Template" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Skip to Message" }),
    ).toHaveAttribute("href", "#message-input");
  });

  test("passes assistantIsLoading to MessageList", () => {
    setupMocks({ assistantIsLoading: true });
    render(<Home />);
    expect(screen.getByTestId("message-list")).toHaveAttribute(
      "data-loading",
      "true",
    );
  });

  test("passes error to MessageList", () => {
    setupMocks({ error: new Error("oops") });
    render(<Home />);
    expect(screen.getByTestId("message-list")).toHaveAttribute(
      "data-error",
      "oops",
    );
  });

  test("passes model to ControlPanel", () => {
    render(<Home />);
    expect(screen.getByTestId("cp-model")).toHaveTextContent(
      AssistantModel.FULL,
    );
  });

  test("passes temperature to ControlPanel", () => {
    render(<Home />);
    expect(screen.getByTestId("cp-temperature")).toHaveTextContent(
      AssistantTemperature.BALANCED,
    );
  });

  test("passes canRegenerate as true when hasUserMessage is true", () => {
    setupMocks({ hasUserMessage: true });
    render(<Home />);
    expect(screen.getByTestId("cp-can-regenerate")).toHaveTextContent("true");
  });

  test("passes disabled as true when assistantIsLoading is true", () => {
    setupMocks({ assistantIsLoading: true });
    render(<Home />);
    expect(screen.getByTestId("cp-disabled")).toHaveTextContent("true");
  });

  test("model state updates when setModel is called from ControlPanel", () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("cp-set-model"));
    expect(screen.getByTestId("cp-model")).toHaveTextContent("gpt-4o-mini");
  });

  test("temperature state updates when setTemperature is called from ControlPanel", () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("cp-set-temperature"));
    expect(screen.getByTestId("cp-temperature")).toHaveTextContent("CREATIVE");
  });

  test("handleRegenerateResponse from useChatSetup is wired to ControlPanel", () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("cp-regenerate"));
    expect(mockHandleRegenerateResponse).toHaveBeenCalledTimes(1);
  });

  test("handleSendMessage from useChatSetup is wired to ControlPanel", () => {
    render(<Home />);
    fireEvent.click(screen.getByTestId("cp-send"));
    expect(mockHandleSendMessage).toHaveBeenCalledWith("hi");
  });
});
