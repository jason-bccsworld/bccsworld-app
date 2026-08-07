import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Key, Loader2, Copy, Download, RefreshCw, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TenantContext {
  multiTenant?: boolean;
  activeOrganizationId?: string | null;
  isPlatformStaff?: boolean;
  organizations?: { organizationId: string; orgRole?: string }[];
}

/**
 * Signing-key management card for organization admins.
 * Renders nothing unless the current user is an admin of the active
 * organization (or platform staff). Server routes enforce the same rule.
 */
export default function SigningKeyCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenant } = useQuery<TenantContext>({
    queryKey: ["/api/session/tenant"],
  });

  const activeOrgId = tenant?.activeOrganizationId ?? null;
  const membership = tenant?.organizations?.find(
    (m) => m.organizationId === activeOrgId,
  );
  const canManage =
    !!activeOrgId && (tenant?.isPlatformStaff || membership?.orgRole === "admin");

  const { data: orgKey, refetch: refetchKey } = useQuery<any>({
    queryKey: ["/api/org-keys/current"],
    enabled: canManage,
  });

  const generateKeyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/org-keys/generate"),
    onSuccess: () => {
      refetchKey();
      queryClient.invalidateQueries({ queryKey: ["/api/org-keys/current"] });
      toast({
        title: orgKey?.hasKey ? "Key rotated" : "Key pair generated",
        description: orgKey?.hasKey
          ? "Previous key deactivated. New Ed25519 key is now active."
          : "Ed25519 signing key generated and activated.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Key generation failed", description: err.message, variant: "destructive" });
    },
  });

  if (!canManage) return null;

  const copyFingerprint = () => {
    if (orgKey?.fingerprint) {
      navigator.clipboard.writeText(orgKey.fingerprint);
      toast({ title: "Copied", description: "Fingerprint copied to clipboard." });
    }
  };

  const downloadPublicKey = () => {
    const a = document.createElement("a");
    a.href = "/api/org-keys/public-key";
    a.download = "bccs-org-public-key.pem";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Card data-testid="card-signing-key">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-600" />
          Organization Signing Key (Ed25519)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {orgKey?.hasKey ? (
          <>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              Active — records are being automatically signed
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Key Algorithm</p>
                <Badge variant="secondary" className="font-mono">Ed25519</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Key Created</p>
                <p className="text-sm text-gray-700">
                  {orgKey.createdAt ? new Date(orgKey.createdAt).toLocaleString() : "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Public Key Fingerprint (SHA-256)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-gray-100 px-3 py-2 rounded break-all text-gray-700" data-testid="text-key-fingerprint">
                  {orgKey.fingerprint}
                </code>
                <Button variant="ghost" size="sm" onClick={copyFingerprint} className="flex-shrink-0" data-testid="button-copy-fingerprint">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Share this fingerprint with regulatory authorities for out-of-band verification</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={downloadPublicKey} data-testid="button-download-public-key">
                <Download className="h-4 w-4 mr-2" />
                Download Public Key (.pem)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateKeyMutation.mutate()}
                disabled={generateKeyMutation.isPending}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                data-testid="button-rotate-key"
              >
                {generateKeyMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rotating…</>
                  : <><RefreshCw className="h-4 w-4 mr-2" />Rotate Key</>
                }
              </Button>
            </div>
            <p className="text-xs text-amber-700">
              ⚠ Rotating the key will deactivate the current key. Existing signed records remain verifiable against the old key fingerprint. New records will use the new key.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              No signing key generated yet. Training records cannot be cryptographically signed.
            </div>
            <Button
              onClick={() => generateKeyMutation.mutate()}
              disabled={generateKeyMutation.isPending}
              data-testid="button-generate-key"
            >
              {generateKeyMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Ed25519 Key Pair…</>
                : <><Key className="h-4 w-4 mr-2" />Generate Ed25519 Signing Key</>
              }
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
