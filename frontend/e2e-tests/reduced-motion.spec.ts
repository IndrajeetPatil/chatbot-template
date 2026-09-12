import { expect, test } from "@playwright/test";
import { openChat } from "./chat-fixture";

test.use({ reducedMotion: "no-preference" });

test("honors reduced motion for the loading indicator and controls", async ({
  page,
}) => {
  await page.route("**/api/v1/chat", () => {});
  await openChat(page);
  await page.getByRole("textbox").fill("Take your time.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const responseStatus = page.getByRole("status");
  await expect(responseStatus).toHaveText("Generating…");
  const runningAnimations = () =>
    responseStatus.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    );
  const modelControl = page.getByRole("button", {
    name: /Select assistant model/,
  });
  const transitionDuration = () =>
    modelControl.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );

  await expect.poll(runningAnimations).toBeGreaterThan(0);
  await expect.poll(transitionDuration).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(runningAnimations).toBe(0);
  await expect.poll(transitionDuration).toBeLessThanOrEqual(0.00001);
  await expect(responseStatus).toHaveText("Generating…");
});
