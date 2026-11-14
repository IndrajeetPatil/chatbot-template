/* v8 ignore file */
import React from "react";
import { createRoot } from "react-dom/client";

import ChatPage from "@/app/chat/Page";
import { initializeAnalytics } from "@/client/analytics";

import "@/app/styles.css";

initializeAnalytics();

if (globalThis.location.pathname === "/") {
  globalThis.history.replaceState(null, "", "/chat");
}

const root = document.querySelector("#root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <React.StrictMode>
    <ChatPage />
  </React.StrictMode>,
);
