// @vitest-environment jsdom
/**
 * Client-side counterpart to server/__tests__/signup-welcome-flow.test.ts.
 *
 * Verifies the welcome dialog renders when /api/auth/user reports
 * welcomePending=true, that acknowledging it POSTs /api/auth/welcome-ack
 * and hides the dialog, and that users without the flag never see it.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { WelcomeOnboardingDialog } from "../welcome-onboarding";
import { queryClient } from "@/lib/queryClient";

function setUser(user: Record<string, unknown> | null) {
  queryClient.setQueryData(["/api/auth/user"], user);
}

function renderDialog() {
  return render(
    <QueryClientProvider client={queryClient}>
      <WelcomeOnboardingDialog />
    </QueryClientProvider>,
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  queryClient.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WelcomeOnboardingDialog", () => {
  it("renders the welcome dialog when welcomePending=true", () => {
    setUser({ id: "u1", firstName: "Ada", welcomePending: true });
    renderDialog();

    expect(screen.getByTestId("dialog-welcome-onboarding")).toBeTruthy();
    expect(
      screen.getByText(/Welcome, Ada! Your organization is ready/i),
    ).toBeTruthy();
    // All three onboarding steps are shown
    expect(screen.getByTestId("welcome-step-1")).toBeTruthy();
    expect(screen.getByTestId("welcome-step-2")).toBeTruthy();
    expect(screen.getByTestId("welcome-step-3")).toBeTruthy();
  });

  it("acknowledge button POSTs /api/auth/welcome-ack and hides the dialog", async () => {
    setUser({ id: "u1", firstName: "Ada", welcomePending: true });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    renderDialog();

    await userEvent.click(screen.getByTestId("button-welcome-dismiss"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/welcome-ack",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId("dialog-welcome-onboarding")).toBeNull();
    });

    // Cached user is updated so the dialog never re-appears
    const cached = queryClient.getQueryData<any>(["/api/auth/user"]);
    expect(cached?.welcomePending).toBe(false);
  });

  it("does not render for a user with welcomePending=false", () => {
    setUser({ id: "u2", firstName: "Bob", welcomePending: false });
    renderDialog();
    expect(screen.queryByTestId("dialog-welcome-onboarding")).toBeNull();
  });

  it("does not render when no user is logged in", () => {
    setUser(null);
    renderDialog();
    expect(screen.queryByTestId("dialog-welcome-onboarding")).toBeNull();
  });
});
