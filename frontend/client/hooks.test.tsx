import { renderHook } from "@testing-library/react";
import { describe, test, expect } from "vite-plus/test";

import { useIsDark } from "./hooks";
import { makeThemeWrapper } from "./testUtils";

describe(useIsDark, () => {
  test.each([
    ["dark", true],
    ["light", false],
  ] as const)("returns %s palette mode as %s", (mode, expected) => {
    const { result } = renderHook(() => useIsDark(), {
      wrapper: makeThemeWrapper(mode),
    });
    expect(result.current).toBe(expected);
  });
});
