import "@testing-library/jest-dom/vitest";

// jsdom has no layout engine; scrolling behavior is also covered in Playwright.
globalThis.ResizeObserver = class implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
