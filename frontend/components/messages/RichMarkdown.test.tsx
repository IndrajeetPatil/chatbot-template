import { screen } from "@testing-library/react";
import { renderWithTheme } from "@/client/testUtils";
import RichMarkdown from "./RichMarkdown";

test.each([
  ["javascript", 'const greeting = "hello";', ".hljs-keyword", "const"],
  ["python", 'def greet():\n    return "hello"', ".hljs-keyword", "def"],
  ["sql", "SELECT count(*) FROM users;", ".hljs-keyword", "SELECT"],
])("highlights %s with library tokens", (language, source, selector, token) => {
  const { container } = renderWithTheme(
    <RichMarkdown content={`\`\`\`${language}\n${source}\n\`\`\``} />,
  );
  expect(container.querySelector(selector)).toHaveTextContent(token);
  expect(screen.getByTestId("code-block").textContent).toBe(`${source}\n`);
});

test.each(["", "unknown-language", "text"])(
  "preserves code with the %s language and dollar signs",
  (language) => {
    const { container } = renderWithTheme(
      <RichMarkdown
        content={`\`\`\`${language}\n$literal$ <b>code</b>\n\`\`\``}
      />,
    );
    expect(screen.getByTestId("code-block").textContent).toBe(
      "$literal$ <b>code</b>\n",
    );
    expect(container.querySelector(".katex, .hljs-string, b")).toBeNull();
  },
);

test("renders inline, display, and fenced math with accessible MathML", () => {
  const { container } = renderWithTheme(
    <RichMarkdown
      content={String.raw`Inline $E = mc^2$.

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

~~~math
\sqrt{2}
~~~`}
    />,
  );
  expect(container.querySelectorAll(".katex")).toHaveLength(3);
  expect(container.querySelectorAll(".katex-display")).toHaveLength(2);
  expect(container.querySelectorAll("math")).toHaveLength(3);
  expect(container.querySelector("mfrac")).not.toBeNull();
  expect(container.querySelector(".katex-error")).toBeNull();
});

test("recovers as an incomplete streamed equation becomes valid", () => {
  const { container, rerender } = renderWithTheme(
    <RichMarkdown content={"$$\n\\frac{1}{"} />,
  );
  expect(container.querySelector(".katex-error")).toHaveTextContent(
    "\\frac{1}{",
  );
  rerender(<RichMarkdown content={"$$\n\\frac{1}{2}\n$$"} />);
  expect(container.querySelector(".katex-error")).toBeNull();
  expect(container.querySelector("math mfrac")).not.toBeNull();
});

test("keeps inline code and escaped currency literal", () => {
  const { container } = renderWithTheme(
    <RichMarkdown content={"`$literal$` costs \\$5 and \\$10."} />,
  );
  expect(container.querySelector("code")).toHaveTextContent("$literal$");
  expect(container).toHaveTextContent("costs $5 and $10.");
  expect(container.querySelector(".katex")).toBeNull();
});

test("does not activate raw HTML, unsafe URLs, or trusted KaTeX commands", () => {
  const { container } = renderWithTheme(
    <RichMarkdown
      content={String.raw`<img src="x" onerror="alert(1)"><script>alert(1)</script>

[unsafe](javascript:alert%281%29)

$\href{javascript:alert(1)}{unsafe}$ $\includegraphics{https://example.com/track.png}$`}
    />,
  );
  expect(container.querySelector("script, img, [onerror]")).toBeNull();
  expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  expect(container.querySelector(".katex a, .katex img")).toBeNull();
});
