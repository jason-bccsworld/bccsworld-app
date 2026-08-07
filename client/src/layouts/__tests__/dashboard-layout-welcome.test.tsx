// @vitest-environment jsdom
/**
 * Guards the desktop mount of the welcome onboarding dialog.
 *
 * The dialog component itself is covered by
 * client/src/components/__tests__/welcome-onboarding.test.tsx and the mobile
 * mount by client/src/pages/__tests__/mobile-field-welcome.test.tsx; this test
 * renders the full DashboardLayout shell so a refactor that drops
 * <WelcomeOnboardingDialog /> fails CI instead of silently hiding the welcome
 * guide from desktop signups.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import DashboardLayout from "../dashboard-layout";
import { queryClient } from "@/lib/queryClient";

function setUser(user: Record<string, unknown> | null) {
  queryClient.setQueryData(["/api/auth/user"], user);
}

function renderDashboardLayout() {
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardLayout>
        <div>content</div>
      </DashboardLayout>
    </QueryClientProvider>,
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  queryClient.clear();
  fetchMock.mockReset();
  // Keep background queries (e.g. /api/session/tenant, license) inert.
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({}), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DashboardLayout welcome onboarding mount", () => {
  it("shows the welcome dialog for a desktop signup with welcomePending=true", () => {
    setUser({
      id: "u1",
      firstName: "Ada",
      email: "ada@example.com",
      welcomePending: true,
    });
    renderDashboardLayout();

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
    renderDashboardLayout();

    expect(screen.queryByTestId("dialog-welcome-onboarding")).toBeNull();
  });
});
