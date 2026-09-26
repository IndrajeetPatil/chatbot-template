import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// Distance from the end, in pixels, within which the reader counts as caught up.
const NEAR_BOTTOM_PX = 64;

interface ConversationScroll {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  scrollToBottom: () => void;
  showScrollButton: boolean;
}

// Keep the viewport pinned to the end while `following` is set; returns cleanup.
function followResizes(
  viewport: HTMLDivElement,
  content: HTMLDivElement,
  following: RefObject<boolean>,
): () => void {
  const observer = new ResizeObserver(() => {
    if (following.current) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  });
  observer.observe(content);
  observer.observe(viewport);
  return () => {
    observer.disconnect();
  };
}

// Follow new content only while the reader is near the end of the conversation.
export function useConversationScroll(enabled = true): ConversationScroll {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTop = viewport.scrollHeight;
    followingRef.current = true;
    setShowScrollButton(false);
  };

  const onScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const nearBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
      NEAR_BOTTOM_PX;
    followingRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    return enabled && viewport !== null && content !== null
      ? followResizes(viewport, content, followingRef)
      : undefined;
  }, [enabled]);

  return {
    viewportRef,
    contentRef,
    onScroll,
    scrollToBottom,
    showScrollButton,
  };
}
