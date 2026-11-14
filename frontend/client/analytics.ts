declare global {
  interface Window {
    dataLayer: IArguments[];
    gtag: (...arguments_: unknown[]) => void;
  }
}

function gtag(): void {
  // Google Analytics processes `arguments` objects, not plain arrays.
  // oxlint-disable-next-line prefer-rest-params
  globalThis.window.dataLayer.push(arguments);
}

function initializeAnalytics(): void {
  const { hostname } = globalThis.location;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  ) {
    return;
  }

  const script = document.createElement("script");
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-3BQ49J7KYH";
  script.async = true;
  document.head.append(script);

  globalThis.window.dataLayer = [];
  globalThis.window.gtag = gtag;
  globalThis.window.gtag("js", new Date());
  globalThis.window.gtag("config", "G-3BQ49J7KYH", {
    cookie_flags: "SameSite=Lax;Secure",
  });
}

export { initializeAnalytics };
