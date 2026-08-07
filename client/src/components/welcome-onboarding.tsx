/**
 * In-app welcome dialog for new org admins.
 *
 * Shown when `user.welcomePending` is set — i.e. the post-signup welcome
 * email couldn't be sent (no SMTP provider configured). Dismissing it
 * acknowledges the message on the server so it never re-appears.
 */
import { useMutation } from "@tanstack/react-query";
import { KeyRound, UserPlus, FileBadge, PartyPopper } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

const STEPS = [
  {
    icon: KeyRound,
    title: "Review your signing keys",
    detail:
      "An Ed25519 signing key was generated for your organization. Visit Key Management to review it so training records can be cryptographically signed.",
  },
  {
    icon: UserPlus,
    title: "Invite your team",
    detail:
      "Add instructors, auditors, and viewers from the admin dashboard — your trial includes 5 seats.",
  },
  {
    icon: FileBadge,
    title: "Add your certificate number",
    detail:
      "Enter your training certificate number in organization settings so compliance checks and generated documents reference the right certificate.",
  },
];

export function WelcomeOnboardingDialog() {
  const { user } = useAuth();
  const welcomePending = Boolean((user as any)?.welcomePending);

  const ack = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/welcome-ack");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], (prev: any) =>
        prev ? { ...prev, welcomePending: false } : prev,
      );
    },
  });

  if (!welcomePending) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && ack.mutate()}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-welcome-onboarding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-indigo-600" />
            Welcome{(user as any)?.firstName ? `, ${(user as any).firstName}` : ""}! Your organization is ready
          </DialogTitle>
          <DialogDescription>
            Your 30-day trial is active. Here are the top three steps to get set up:
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-4 py-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex items-start gap-3" data-testid={`welcome-step-${i + 1}`}>
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {i + 1}. {step.title}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <DialogFooter>
          <Button
            onClick={() => ack.mutate()}
            disabled={ack.isPending}
            data-testid="button-welcome-dismiss"
          >
            Got it — let's get started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
