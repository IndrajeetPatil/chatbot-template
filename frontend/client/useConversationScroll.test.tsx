import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { vi, expect, test } from "vite-plus/test";

import { useConversationScroll } from "./useConversationScroll";

const VIEWPORT_HEIGHT = 300;

function Conversation({ contentHeight }: { contentHeight: number }) {
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
        style={{ height: VIEWPORT_HEIGHT, overflowY: "auto" }}
      >
        <div
          ref={contentRef}
          style={{ height: contentHeight }}
        >
          Messages
        </div>
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

async function openConversation() {
  const rendered = render(<Conversation contentHeight={1000} />);
  const viewport = screen.getByTestId("viewport");
  await waitFor(() => {
    expect(viewport.scrollTop).toBe(1000 - VIEWPORT_HEIGHT);
  });
  return { viewport, ...rendered };
}

test("follows resized content and disconnects when unmounted", async () => {
  const disconnect = vi.spyOn(ResizeObserver.prototype, "disconnect");
  const { viewport, rerender, unmount } = await openConversation();
  rerender(<Conversation contentHeight={1600} />);
  await waitFor(() => {
    expect(viewport.scrollTop).toBe(1600 - VIEWPORT_HEIGHT);
  });
  unmount();
  expect(disconnect).toHaveBeenCalledExactlyOnceWith();
});

test("preserves reading position until the reader jumps back to the latest reply", async () => {
  const { viewport, rerender } = await openConversation();
  viewport.scrollTop = 200;
  const jumpButton = await screen.findByRole("button", {
    name: "Jump to latest",
  });
  // A negative invariant must be checked after the resize callback has run;
  // polling the unchanged position could succeed before the browser renders.
  await act(async () => {
    rerender(<Conversation contentHeight={1600} />);
    const { promise, resolve } = Promise.withResolvers<undefined>();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(undefined);
      });
    });
    await promise;
  });
  expect(viewport.scrollTop).toBe(200);
  fireEvent.click(jumpButton);
  expect(viewport.scrollTop).toBe(1600 - VIEWPORT_HEIGHT);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("resumes following when the reader scrolls near the bottom", async () => {
  const { viewport, rerender } = await openConversation();
  viewport.scrollTop = 200;
  await expect(screen.findByRole("button")).resolves.toBeInTheDocument();
  viewport.scrollTop = 1000 - VIEWPORT_HEIGHT - 10;
  await waitFor(() => {
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  rerender(<Conversation contentHeight={1600} />);
  await waitFor(() => {
    expect(viewport.scrollTop).toBe(1600 - VIEWPORT_HEIGHT);
  });
});
