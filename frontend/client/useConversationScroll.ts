import { useEffect, useRef, useState } from "react";

// Follow new content only while the reader is near the end of the conversation.
export function useConversationScroll(enabled = true) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
    followingRef.current = true;
    setShowScrollButton(false);
  };

  const onScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nearBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 64;
    followingRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  };

  useEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const observer = new ResizeObserver(() => {
      if (followingRef.current) viewport.scrollTop = viewport.scrollHeight;
    });
    observer.observe(content);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [enabled]);

  return {
    viewportRef,
    contentRef,
    onScroll,
    scrollToBottom,
    showScrollButton,
  };
}
