import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { useConversationScroll } from "./useConversationScroll";

let notifyResize: () => void;
const disconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

function Conversation() {
  const {
    viewportRef,
    contentRef,
    onScroll,
    scrollToBottom,
    showScrollButton,
  } = useConversationScroll();
  return (
    <>
      <div
        ref={viewportRef}
        onScroll={onScroll}
        data-testid="viewport"
      >
        <div ref={contentRef}>Messages</div>
      </div>
      {showScrollButton && (
        <button
          type="button"
          onClick={scrollToBottom}
        >
          Jump to latest
        </button>
      )}
    </>
  );
}

function openConversation() {
  const rendered = render(<Conversation />);
  const viewport = screen.getByTestId("viewport");
  Object.defineProperties(viewport, {
    scrollHeight: { value: 1000, configurable: true },
    clientHeight: { value: 300 },
  });
  return { viewport, ...rendered };
}

test("follows resized content and disconnects when unmounted", () => {
  const { viewport, unmount } = openConversation();
  act(() => notifyResize());
  expect(viewport.scrollTop).toBe(1000);
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

test("preserves reading position until the reader jumps back to the latest reply", () => {
  const { viewport } = openConversation();
  viewport.scrollTop = 200;
  fireEvent.scroll(viewport);
  act(() => notifyResize());
  expect(viewport.scrollTop).toBe(200);
  fireEvent.click(screen.getByRole("button", { name: "Jump to latest" }));
  expect(viewport.scrollTop).toBe(1000);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("resumes following when the reader scrolls near the bottom", () => {
  const { viewport } = openConversation();
  fireEvent.scroll(viewport);
  viewport.scrollTop = 690;
  fireEvent.scroll(viewport);
  act(() => notifyResize());
  expect(viewport.scrollTop).toBe(1000);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
