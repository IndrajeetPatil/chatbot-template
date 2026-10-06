import type { ReactElement } from "react";
import Markdown from "react-markdown";
import type { Options } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";
import "@/app/markdown.css";
import { useIsDark } from "@/client/hooks";

// The subset of hast that the plugin below reads and writes.
type HastPropertyValue = boolean | number | string | (number | string)[] | null;

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, HastPropertyValue | undefined>;
  children?: HastNode[];
}

function isScrollableBlock(node: HastNode): boolean {
  const className = node.properties?.className;
  return (
    node.tagName === "pre" ||
    (Array.isArray(className) && className.includes("katex-display"))
  );
}

function focusScrollableBlocks(node: HastNode): void {
  if (isScrollableBlock(node)) {
    node.properties = { ...node.properties, tabIndex: 0 };
  }
  for (const child of node.children ?? []) {
    focusScrollableBlocks(child);
  }
}

// Wide code and display math scroll horizontally, so keyboard users must be
// able to focus them to scroll (WCAG 2.1.1, axe scrollable-region-focusable).
function rehypeFocusableScroll() {
  return focusScrollableBlocks;
}

const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS: Options["rehypePlugins"] = [
  // Render math before highlighting so fenced `math` is not treated as code.
  [
    rehypeKatex,
    { trust: false, maxSize: 10, maxExpand: 1000, errorColor: "inherit" },
  ],
  [rehypeHighlight, { detect: false }],
  rehypeFocusableScroll,
];

export default function RichMarkdown({
  content,
}: {
  content: string;
}): ReactElement {
  const isDark = useIsDark();
  return (
    <div
      className="markdown"
      data-color-scheme={isDark ? "dark" : "light"}
    >
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
      >
        {content}
      </Markdown>
    </div>
  );
}
