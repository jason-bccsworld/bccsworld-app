import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, CheckCircle2, Loader2, Shield, Key, Globe, FileText,
  ShieldCheck, Copy, Download, RefreshCw, ShieldAlert
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

const ORG_TYPES = [
  { value: "part_141", label: "Part 141 – Pilot School" },
  { value: "part_142", label: "Part 142 – Training Center" },
  { value: "part_121", label: "Part 121 – Airline Operations" },
  { value: "part_135", label: "Part 135 – Commuter/On-Demand" },
  { value: "mro", label: "MRO – Maintenance, Repair & Overhaul" },
  { value: "atc", label: "ATC – Air Traffic Control" },
];

const AUTHORITIES = [
  { value: "faa", label: "FAA – Federal Aviation Administration" },
  { value: "easa", label: "EASA – European Union Aviation Safety Agency" },
  { value: "transport_canada", label: "Transport Canada" },
  { value: "casa", label: "CASA – Civil Aviation Safety Authority" },
  { value: "gcaa", label: "GCAA – General Civil Aviation Authority" },
];

export default function OrganizationSetup() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: existingOrg, isLoading: orgLoading } = useQuery<any>({
    queryKey: ["/api/auth/organization"],
  });

  const { data: orgKey, refetch: refetchKey } = useQuery<any>({
    queryKey: ["/api/org-keys/current"],
  });

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [authority, setAuthority] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/organizations/setup", {
        organizationName: orgName,
        organizationType: orgType,
        regulatoryAuthority: authority,
        certificateNumber: certNumber || undefined,
        contactInfo: { city, country, phone, email: contactEmail },
      });
      return res.json();
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      // Auto-generate key pair for the new org
      try {
        await apiRequest("POST", "/api/org-keys/generate-for-org", { orgId: data.id });
        queryClient.invalidateQueries({ queryKey: ["/api/org-keys/current"] });
        toast({
          title: "Organization registered",
          description: "Ed25519 signing key pair generated and activated.",
        });
      } catch {
        toast({
          title: "Organization registered",
          description: "Key pair generation failed — generate it manually below.",
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Setup failed",
        description: err.message || "Could not create organization.",
        variant: "destructive",
      });
    },
  });

  const generateKeyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/org-keys/generate"),
    onSuccess: () => {
      refetchKey();
      queryClient.invalidateQueries({ queryKey: ["/api/org-keys/current"] });
      toast({ title: "New key pair generated", description: "Previous key deactivated. New Ed25519 key is now active." });
    },
    onError: (err: any) => {
      toast({ title: "Key generation failed", description: err.message, variant: "destructive" });
    },
  });

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

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (existingOrg) {
    const typeLabel = ORG_TYPES.find(t => t.value === existingOrg.organizationType)?.label || existingOrg.organizationType;
    const authLabel = AUTHORITIES.find(a => a.value === existingOrg.regulatoryAuthority)?.label || existingOrg.regulatoryAuthority;
    const contact = existingOrg.contactInfo || {};

    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Profile</h1>
          <p className="text-gray-600 mt-1">Your registered training organization and cryptographic signing keys</p>
        </div>

        {/* Org details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {existingOrg.organizationName}
              </CardTitle>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Organization Type</p>
                <p className="text-gray-900">{typeLabel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Regulatory Authority</p>
                <p className="text-gray-900">{authLabel}</p>
              </div>
              {existingOrg.certificateNumber && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Certificate Number</p>
                  <p className="text-gray-900 font-mono">{existingOrg.certificateNumber}</p>
                </div>
              )}
              {contact.city && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-gray-900">{[contact.city, contact.country].filter(Boolean).join(", ")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cryptographic key section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-5 w-5 text-blue-600" />
              Cryptographic Signing Key (Ed25519)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orgKey?.hasKey ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  Active — records are being automatically signed
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Key Algorithm</p>
                  <Badge variant="secondary" className="font-mono">Ed25519</Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Public Key Fingerprint (SHA-256)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-gray-100 px-3 py-2 rounded break-all text-gray-700">
                      {orgKey.fingerprint}
                    </code>
                    <Button variant="ghost" size="sm" onClick={copyFingerprint} className="flex-shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Share this fingerprint with regulatory authorities for out-of-band verification</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Key Created</p>
                  <p className="text-sm text-gray-700">
                    {orgKey.createdAt ? new Date(orgKey.createdAt).toLocaleString() : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Public Key (PEM)</p>
                  <pre className="text-[11px] font-mono bg-gray-100 p-3 rounded overflow-x-auto text-gray-600 leading-relaxed whitespace-pre-wrap break-all">
                    {orgKey.publicKeyPem}
                  </pre>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={downloadPublicKey}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Public Key (.pem)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateKeyMutation.mutate()}
                    disabled={generateKeyMutation.isPending}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
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
                  className="w-full"
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

        {/* What the key does */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How cryptographic signing works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {[
                { icon: Key, title: "Ed25519 Key Pair", desc: "Industry-standard elliptic curve algorithm used in SSH, TLS, and government PKI systems" },
                { icon: Shield, title: "Per-Record Signatures", desc: "Every training record is signed with a cryptographic hash that can prove it hasn't been altered" },
                { icon: ShieldCheck, title: "Chain of Trust", desc: "Each signature includes the hash of the previous record, making the entire ledger tamper-evident" },
                { icon: Globe, title: "Regulatory Verification", desc: "Share your public key fingerprint with the FAA, EASA, or any authority for independent verification" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
                  <Icon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">{title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organization Setup</h1>
        <p className="text-gray-600 mt-1">
          Register your training organization to enable full compliance management and Ed25519-signed record keeping.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Training Organization Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Apex Flight Training Center"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Organization Type *</Label>
              <Select value={orgType} onValueChange={setOrgType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Regulatory Authority *</Label>
              <Select value={authority} onValueChange={setAuthority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select authority" />
                </SelectTrigger>
                <SelectContent>
                  {AUTHORITIES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="certNumber">Certificate / AOC Number (optional)</Label>
            <Input
              id="certNumber"
              value={certNumber}
              onChange={e => setCertNumber(e.target.value)}
              placeholder="e.g. TA4R141-0001"
              className="font-mono"
            />
          </div>

          <Separator />

          <p className="text-sm font-medium text-gray-700">Contact Information (optional)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="compliance@org.com" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
            <div className="flex items-center gap-2 font-medium mb-1">
              <Key className="h-4 w-4" /> An Ed25519 key pair will be generated for your organization
            </div>
            <p className="text-blue-700">
              The private key is encrypted and stored server-side. Every training record will be automatically signed. Your public key fingerprint can be shared with regulatory authorities for independent verification.
            </p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => setupMutation.mutate()}
            disabled={
              setupMutation.isPending ||
              !orgName.trim() ||
              !orgType ||
              !authority
            }
          >
            {setupMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up & generating key pair…</>
            ) : (
              <><Building2 className="h-4 w-4 mr-2" />Register Organization + Generate Signing Key</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
