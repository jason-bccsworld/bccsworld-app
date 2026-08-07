// @vitest-environment jsdom
/**
 * Guards the mobile mount of the welcome onboarding dialog.
 *
 * The dialog component itself is covered by
 * client/src/components/__tests__/welcome-onboarding.test.tsx; this test
 * renders the full MobileField page so a refactor of mobile-field.tsx that
 * drops <WelcomeOnboardingDialog /> fails CI instead of silently hiding the
 * welcome guide from phone signups.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import MobileField from "../mobile-field";
import { queryClient } from "@/lib/queryClient";

function setUser(user: Record<string, unknown> | null) {
  queryClient.setQueryData(["/api/auth/user"], user);
}

function renderMobileField() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MobileField />
    </QueryClientProvider>,
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  queryClient.clear();
  fetchMock.mockReset();
  // Keep background queries (e.g. /api/documents) inert.
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify([]), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MobileField welcome onboarding mount", () => {
  it("shows the welcome dialog for a phone signup with welcomePending=true", () => {
    setUser({
      id: "u1",
      firstName: "Ada",
      email: "ada@example.com",
      welcomePending: true,
    });
    renderMobileField();

    expect(screen.getByTestId("dialog-welcome-onboarding")).toBeTruthy();
    expect(
      screen.getByText(/Welcome, Ada! Your organization is ready/i),
    ).toBeTruthy();
  });

  it("does not show the dialog when welcomePending=false", () => {
    setUser({
      id: "u2",
      firstName: "Bob",
      email: "bob@example.com",
      welcomePending: false,
    });
    renderMobileField();

    expect(screen.queryByTestId("dialog-welcome-onboarding")).toBeNull();
  });
});
