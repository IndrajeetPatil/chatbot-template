import { screen } from "@testing-library/react";
import { describe, expect, test } from "vite-plus/test";

import { renderWithTheme } from "@/client/testUtils";

import UserMessage from "./UserMessage";

describe(UserMessage, () => {
  test("renders the user label and message content", () => {
    renderWithTheme(<UserMessage content="Hello from user" />);
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Hello from user")).toBeInTheDocument();
  });

  test("preserves whitespace in pre-wrap format", () => {
    const multiline = "Line 1\n  Line 2 with spaces\n\nLine 3";
    renderWithTheme(<UserMessage content={multiline} />);
    expect(
      screen.getByText(multiline, { collapseWhitespace: false }),
    ).toBeInTheDocument();
  });
});
