import { definePlugin, defineRule } from "vite-plus/lint/plugins";

/** @import { ESTree } from "vite-plus/lint/plugins" */

const DANGEROUS_PROP = "dangerouslySetInnerHTML";

/**
 * Reads the name of an object property key.
 * @param {ESTree.PropertyKey} key - Identifier, literal, or computed key.
 * @returns {unknown} The static key name, or `undefined` if it is computed.
 */
function staticKeyName(key) {
  if (key.type === "Identifier") {
    return key.name;
  }
  return key.type === "Literal" ? key.value : undefined;
}

// `react/no-danger` only sees JSX attributes; this rule also catches
// dangerouslySetInnerHTML hidden in objects that are later spread as props.
// Destructuring patterns also contain `Property` nodes, so only object
// literals are reported.
const noDangerousHtmlProps = defineRule({
  meta: {
    messages: {
      noDangerousHtml: `Do not create React ${DANGEROUS_PROP} props.`,
    },
  },
  create(context) {
    return {
      Property(node) {
        if (
          node.parent.type === "ObjectExpression" &&
          staticKeyName(node.key) === DANGEROUS_PROP
        ) {
          context.report({ node, messageId: "noDangerousHtml" });
        }
      },
    };
  },
});

export default definePlugin({
  meta: { name: "security" },
  rules: { "no-dangerous-html-props": noDangerousHtmlProps },
});
