import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useDarkMode } from "./useDarkMode";

class MockMediaQueryList extends EventTarget implements MediaQueryList {
  readonly matches: boolean;
  readonly media: string;
  onchange:
    | ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown)
    | null = null;

  constructor(matches: boolean, media: string) {
    super();
    this.matches = matches;
    this.media = media;
  }

  addListener(): void {}
  removeListener(): void {}
}

function mockMatchMedia(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      new MockMediaQueryList(
        prefersDark && query === "(prefers-color-scheme: dark)",
        query,
      ),
  );
}

describe("useDarkMode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("initializes to dark mode when system prefers dark", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.darkMode).toBe(true);
  });

  test("initializes to light mode when system prefers light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.darkMode).toBe(false);
  });

  test("toggleDarkMode flips dark to light", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current.toggleDarkMode());
    expect(result.current.darkMode).toBe(false);
  });

  test("toggleDarkMode flips light to dark", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current.toggleDarkMode());
    expect(result.current.darkMode).toBe(true);
  });

  function withThemeColorMeta(fn: (meta: HTMLMetaElement) => void) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
    try {
      fn(meta);
    } finally {
      meta.remove();
    }
  }

  test("syncs colorScheme and theme-color meta to dark", () => {
    mockMatchMedia(true);
    withThemeColorMeta((meta) => {
      renderHook(() => useDarkMode());
      expect(document.documentElement.style.colorScheme).toBe("dark");
      expect(meta.content).toBe("#121212");
    });
  });

  test("syncs colorScheme and theme-color meta to light", () => {
    mockMatchMedia(false);
    withThemeColorMeta((meta) => {
      renderHook(() => useDarkMode());
      expect(document.documentElement.style.colorScheme).toBe("light");
      expect(meta.content).toBe("#ffffff");
    });
  });

  test("syncs browser chrome metadata when toggled from dark to light", () => {
    mockMatchMedia(true);
    withThemeColorMeta((meta) => {
      const { result } = renderHook(() => useDarkMode());
      act(() => result.current.toggleDarkMode());
      expect(document.documentElement.style.colorScheme).toBe("light");
      expect(meta.content).toBe("#ffffff");
    });
  });

  test("theme palette mode is dark when darkMode is true", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.theme.palette.mode).toBe("dark");
  });

  test("theme palette mode is light when darkMode is false", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.theme.palette.mode).toBe("light");
  });

  test("defaults to dark mode when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.darkMode).toBe(true);
  });
});
