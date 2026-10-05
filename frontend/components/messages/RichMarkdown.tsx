import type { ReactElement } from "react";
import Markdown from "react-markdown";
import type { Options } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";
import "@/app/markdown.css";
import { useIsDark } from "@/client/hooks";

const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS: Options["rehypePlugins"] = [
  // Render math before highlighting so fenced `math` is not treated as code.
  [
    rehypeKatex,
    { trust: false, maxSize: 10, maxExpand: 1000, errorColor: "inherit" },
  ],
  [rehypeHighlight, { detect: false }],
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
