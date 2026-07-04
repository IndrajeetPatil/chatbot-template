import { createTheme, ThemeProvider } from "@mui/material";
import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { vi } from "vitest";

import AssistantMessage from "./AssistantMessage";

interface MockComponents {
  pre: React.FC<{ children?: React.ReactNode }>;
  code: React.FC<{ className?: string; children?: React.ReactNode }>;
}

vi.mock("react-markdown", () => ({
  __esModule: true,
  default: ({
    children,
    components,
  }: {
    children: string;
    components: MockComponents;
  }): React.JSX.Element => {
    const parts = children.split(/(```[\s\S]*?```)/);
    let offset = 0;

    return (
      <div data-testid="markdown-content">
        {parts.map((part) => {
          const key = `part-${offset}`;
          offset += part.length || 1;

          if (part.startsWith("```")) {
            const Pre = components.pre;
            const Code = components.code;
            const lang = part.match(/^```(\w*)/)?.[1];
            const className = lang ? `language-${lang}` : undefined;
            const codeContent = part.replace(/```\w*\n?|\n?```/g, "");
            return (
              <Pre key={key}>
                <Code className={className}>{codeContent}</Code>
              </Pre>
            );
          }
          return <span key={key}>{part}</span>;
        })}
      </div>
    );
  },
}));

const Wrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}): React.JSX.Element => (
  <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>
);

describe("AssistantMessage", () => {
  test.each([
    ["plain text", "This is a simple text message"],
    ["empty content", ""],
    ["inline code", "Use the `console.log()` function"],
  ])("renders %s without error", async (_label, content) => {
    render(
      <AssistantMessage
        content={content}
        isFirstMessage={false}
      />,
      { wrapper: Wrapper },
    );
    expect(await screen.findByTestId("markdown-content")).toBeInTheDocument();
  });

  test("renders code block with block container", async () => {
    render(
      <AssistantMessage
        content={'```javascript\nconsole.log("hello");\n```'}
        isFirstMessage={false}
      />,
      { wrapper: Wrapper },
    );
    expect(await screen.findByTestId("markdown-content")).toBeInTheDocument();
    expect(await screen.findByTestId("code-block")).toBeInTheDocument();
  });

  test("does not show copy button when isFirstMessage is true", () => {
    const { queryByRole } = render(
      <AssistantMessage
        content="Welcome!"
        isFirstMessage={true}
      />,
      { wrapper: Wrapper },
    );
    expect(queryByRole("button")).not.toBeInTheDocument();
  });

  test("shows copy button when isFirstMessage is false", () => {
    const { getByRole } = render(
      <AssistantMessage
        content="A response"
        isFirstMessage={false}
      />,
      { wrapper: Wrapper },
    );
    expect(getByRole("button")).toBeInTheDocument();
  });

  describe("copy button clipboard interaction", () => {
    let savedClipboard: Clipboard;

    beforeEach(() => {
      savedClipboard = navigator.clipboard;
    });

    afterEach(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: savedClipboard,
        configurable: true,
        writable: true,
      });
    });

    test("calls clipboard writeText with message content on click", () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
        writable: true,
      });

      const { getByRole } = render(
        <AssistantMessage
          content="Copy me!"
          isFirstMessage={false}
        />,
        { wrapper: Wrapper },
      );

      fireEvent.click(getByRole("button"));
      expect(writeText).toHaveBeenCalledWith("Copy me!");
    });
  });
});
