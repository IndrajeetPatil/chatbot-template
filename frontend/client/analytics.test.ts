import { afterEach, describe, expect, test } from "vite-plus/test";

import { initializeAnalytics } from "./analytics";

describe(initializeAnalytics, () => {
  afterEach(() => {
    for (const element of document.querySelectorAll(
      "script[src*='googletagmanager']",
    )) {
      element.remove();
    }
    delete (globalThis.window as { dataLayer?: unknown }).dataLayer;
    delete (globalThis.window as { gtag?: unknown }).gtag;
  });

  test.each(["localhost", "127.0.0.1", "[::1]"] as const)(
    "does not initialize tracking on local hostname %s",
    (hostname) => {
      initializeAnalytics(hostname);
      expect(
        document.querySelector("script[src*='googletagmanager']"),
      ).toBeNull();
      expect(globalThis.window.dataLayer).toBeUndefined();
      expect(globalThis.window.gtag).toBeUndefined();
    },
  );

  test("injects Google Tag script and initializes dataLayer on remote hostname", () => {
    initializeAnalytics("chat.example.com");

    const script = document.querySelector<HTMLScriptElement>(
      "script[src*='googletagmanager']",
    );
    expect(script).not.toBeNull();
    expect(script?.src).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-3BQ49J7KYH",
    );
    expect(script?.async).toBe(true);
    expect(globalThis.window.dataLayer).toBeDefined();
    expect(globalThis.window.gtag).toBeTypeOf("function");
  });

  test("gtag dispatches events into dataLayer", () => {
    initializeAnalytics("chat.example.com");
    globalThis.window.gtag("event", "custom_event", { value: 42 });
    expect(globalThis.window.dataLayer.length).toBeGreaterThanOrEqual(3);
  });

  test("defaults to global location hostname", () => {
    // In Chromium Vitest runner, the default page is on localhost/127.0.0.1
    initializeAnalytics();
    expect(
      document.querySelector("script[src*='googletagmanager']"),
    ).toBeNull();
  });
});
