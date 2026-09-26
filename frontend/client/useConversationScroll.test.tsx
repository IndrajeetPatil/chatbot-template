import { act, fireEvent, render, screen } from "@testing-library/react";
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

// Scroll events and ResizeObserver callbacks both run during the browser's
// next rendering update; two frames guarantee that update has completed.
async function nextRender() {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resolve(undefined);
    });
  });
  await promise;
}

async function settle(change?: () => void) {
  await act(async () => {
    change?.();
    await nextRender();
  });
}

async function openConversation() {
  const rendered = render(<Conversation contentHeight={1000} />);
  const viewport = screen.getByTestId("viewport");
  await settle();
  const grow = async (contentHeight: number) =>
    settle(() => {
      rendered.rerender(<Conversation contentHeight={contentHeight} />);
    });
  const scrollTo = async (top: number) =>
    settle(() => {
      viewport.scrollTop = top;
    });
  return { viewport, grow, scrollTo, unmount: rendered.unmount };
}

test("follows resized content and disconnects when unmounted", async () => {
  const disconnect = vi.spyOn(ResizeObserver.prototype, "disconnect");
  const { viewport, grow, unmount } = await openConversation();
  expect(viewport.scrollTop).toBe(1000 - VIEWPORT_HEIGHT);
  await grow(1600);
  expect(viewport.scrollTop).toBe(1600 - VIEWPORT_HEIGHT);
  unmount();
  expect(disconnect).toHaveBeenCalledExactlyOnceWith();
});

test("preserves reading position until the reader jumps back to the latest reply", async () => {
  const { viewport, grow, scrollTo } = await openConversation();
  await scrollTo(200);
  await grow(1600);
  expect(viewport.scrollTop).toBe(200);
  fireEvent.click(screen.getByRole("button", { name: "Jump to latest" }));
  expect(viewport.scrollTop).toBe(1600 - VIEWPORT_HEIGHT);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("resumes following when the reader scrolls near the bottom", async () => {
  const { viewport, grow, scrollTo } = await openConversation();
  await scrollTo(200);
  expect(screen.getByRole("button")).toBeInTheDocument();
  await scrollTo(1000 - VIEWPORT_HEIGHT - 10);
  await grow(1600);
  expect(viewport.scrollTop).toBe(1600 - VIEWPORT_HEIGHT);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
