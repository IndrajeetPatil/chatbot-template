import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vite-plus/test";

// With Vitest globals off, Testing Library cannot register its own cleanup.
afterEach(cleanup);
