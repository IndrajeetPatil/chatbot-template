import type { ComponentPropsWithoutRef } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import "@/app/markdown.css";
import { useIsDark } from "@/client/hooks";

const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS: NonNullable<
  ComponentPropsWithoutRef<typeof Markdown>["rehypePlugins"]
> = [
  // Render math before highlighting so fenced `math` is not treated as code.
  [
    rehypeKatex,
    { trust: false, maxSize: 10, maxExpand: 1000, errorColor: "inherit" },
  ],
  [rehypeHighlight, { detect: false }],
];

function CodeBlock({ children }: ComponentPropsWithoutRef<"pre">) {
  return <pre data-testid="code-block">{children}</pre>;
}

const COMPONENTS = { pre: CodeBlock };

export default function RichMarkdown({ content }: { content: string }) {
  const isDark = useIsDark();
  return (
    <div
      className="markdown"
      data-color-scheme={isDark ? "dark" : "light"}
    >
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={COMPONENTS}
      >
        {content}
      </Markdown>
    </div>
  );
}
