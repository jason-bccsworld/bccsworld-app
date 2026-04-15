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
import { Building2, CheckCircle2, Loader2, Shield, Key, Globe, FileText } from "lucide-react";
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
      return apiRequest("POST", "/api/organizations/setup", {
        organizationName: orgName,
        organizationType: orgType,
        regulatoryAuthority: authority,
        certificateNumber: certNumber || undefined,
        contactInfo: { city, country, phone, email: contactEmail },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      toast({
        title: "Organization created",
        description: "Your training organization has been set up successfully.",
      });
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (err: any) => {
      toast({
        title: "Setup failed",
        description: err.message || "Could not create organization.",
        variant: "destructive",
      });
    },
  });

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
          <p className="text-gray-600 mt-1">Your registered training organization details</p>
        </div>

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

            <Separator />

            <div>
              <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                <Key className="h-3 w-3" /> BCCS Master Public Key
              </p>
              <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all text-gray-700">
                {existingOrg.masterPublicKey}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Shield className="h-3 w-3 text-green-600" />
              Blockchain key generated on{" "}
              {existingOrg.keyGenerationDate
                ? new Date(existingOrg.keyGenerationDate).toLocaleDateString()
                : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What's included with your BCCS organization key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: FileText, text: "Immutable compliance record storage" },
                { icon: Shield, text: "Tamper-proof audit trail" },
                { icon: Key, text: "Multi-signature training record verification" },
                { icon: Globe, text: "Cross-border regulatory recognition" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-gray-700">
                  <Icon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  {text}
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
          Register your training organization to unlock full compliance management and blockchain record keeping.
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
              <Key className="h-4 w-4" /> A unique BCCS blockchain key will be generated for your organization
            </div>
            <p className="text-blue-700">
              This key cryptographically signs all training records, enabling tamper-proof compliance verification across regulatory authorities.
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
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up…</>
            ) : (
              <><Building2 className="h-4 w-4 mr-2" />Register Organization</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
