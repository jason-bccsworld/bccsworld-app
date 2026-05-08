import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Settings, Users, Building, Plus, Loader2, Trash2, Shield,
  UserPlus, Search, RotateCcw, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronRight, KeyRound, AlertCircle, Eye, EyeOff,
  ShieldCheck, Lock, Unlock, Edit2, CreditCard, Calendar, Zap,
  Key, Copy, ExternalLink, RefreshCw, Globe, User,
} from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { FeatureGate, LockedBadge } from "@/components/feature-gate";
import { PLAN_DISPLAY, PLAN_FEATURES, type PlanKey } from "@shared/license";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { PERMISSION_DEFINITIONS, PERMISSION_GROUPS, getRoleDisplay, ALL_PERMISSIONS } from "@shared/permissions";

// ── Types ──────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface RoleRecord {
  id: string;
  role_name: string;
  display_name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  color: string;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const rd = getRoleDisplay(role);
  return (
    <Badge className={`${rd.color} border-0 text-xs font-medium`}>
      {rd.displayName}
    </Badge>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
      <CheckCircle2 className="h-3 w-3" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
      <XCircle className="h-3 w-3" /> Inactive
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Reviewer API Keys Panel
// ══════════════════════════════════════════════════════════════════════════

interface ReviewerKey {
  id: string;
  key_preview: string;
  label: string;
  reviewer_name: string;
  reviewer_email: string | null;
  org_ids: string[];
  created_by: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

function ReviewerKeysPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── State ─────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: keys = [], isLoading } = useQuery<ReviewerKey[]>({
    queryKey: ["/api/reviewer-keys"],
  });

  // ── Mutations ─────────────────────────────────────────────────────────
  const createKey = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reviewer-keys", {
        label: newLabel.trim(),
        reviewerName: newName.trim(),
        reviewerEmail: newEmail.trim() || undefined,
        orgIds: [],
        expiresAt: newExpiry || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviewer-keys"] });
      setGeneratedKey(data.key);
      setNewLabel(""); setNewName(""); setNewEmail(""); setNewExpiry("");
    },
    onError: () => toast({ title: "Failed to create key", variant: "destructive" }),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/reviewer-keys/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviewer-keys"] });
      toast({ title: "Key revoked" });
    },
    onError: () => toast({ title: "Failed to revoke key", variant: "destructive" }),
  });

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const portalUrl = (key: string) =>
    `${window.location.origin}/reviewer?key=${encodeURIComponent(key)}`;

  const activeKeys = keys.filter(k => k.is_active);
  const revokedKeys = keys.filter(k => !k.is_active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Reviewer API Keys
              </CardTitle>
              <CardDescription>
                Generate read-only keys for FAA auditors and external reviewers. Each key provides
                secure, login-free access to a shareable reviewer portal.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
          ) : activeKeys.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No active reviewer keys</p>
              <p className="text-sm mt-1">Generate a key to give an auditor read-only portal access.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeKeys.map((k) => (
                <div key={k.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{k.label}</span>
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                      {k.expires_at && new Date(k.expires_at) < new Date() && (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs">Expired</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {k.reviewer_name}
                        {k.reviewer_email && ` · ${k.reviewer_email}`}
                      </span>
                      <span className="font-mono text-slate-400">{k.key_preview}</span>
                      {k.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires {format(new Date(k.expires_at), "MMM d, yyyy")}
                        </span>
                      )}
                      {k.last_used_at && (
                        <span>Last used {formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true })}</span>
                      )}
                      {!k.last_used_at && (
                        <span className="text-slate-400 italic">Never used</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => window.open(`/reviewer?key=${k.key_preview.replace("...", "")}`, "_blank")}
                      title="Open reviewer portal (key preview only — share actual key separately)"
                    >
                      <Globe className="h-4 w-4 mr-1" /> Portal
                    </Button>
                    <Button
                      size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() => revokeKey.mutate(k.id)}
                      disabled={revokeKey.isPending}
                    >
                      {revokeKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {revokedKeys.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Revoked Keys ({revokedKeys.length})</p>
              <div className="space-y-2">
                {revokedKeys.map(k => (
                  <div key={k.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg border bg-slate-50 opacity-60">
                    <div>
                      <span className="text-sm font-medium text-slate-600">{k.label}</span>
                      <span className="text-xs text-slate-400 ml-2">· {k.reviewer_name} · <span className="font-mono">{k.key_preview}</span></span>
                    </div>
                    <Badge className="bg-slate-200 text-slate-500 border-0 text-xs">Revoked</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Generate key dialog ───────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setGeneratedKey(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" /> Generate Reviewer API Key
            </DialogTitle>
            <DialogDescription>
              The key will be shown once. Send it to the reviewer along with the portal URL.
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            /* ── Success: show key ──────────────────────────────────────── */
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-sm font-semibold text-emerald-800 mb-2">Key generated — copy it now</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-white border rounded px-2 py-1.5 break-all text-slate-700">
                    {generatedKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyKey(generatedKey)}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-emerald-700 mt-2">
                  ⚠ This key will not be shown again. Store it securely.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reviewer Portal URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-white border rounded px-2 py-1.5 break-all text-slate-600">
                    {portalUrl(generatedKey)}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyKey(portalUrl(generatedKey))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm" variant="outline" className="w-full mt-1"
                  onClick={() => window.open(portalUrl(generatedKey), "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Preview Reviewer Portal
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setGeneratedKey(null); }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* ── Form ───────────────────────────────────────────────────── */
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium">Key Label <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. FAA Annual Audit 2026"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Internal name to identify this key</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Reviewer Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. John Smith"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Reviewer Email</Label>
                <Input
                  type="email"
                  placeholder="reviewer@faa.gov"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Expiry Date</Label>
                <Input
                  type="date"
                  value={newExpiry}
                  onChange={e => setNewExpiry(e.target.value)}
                  className="mt-1"
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-slate-400 mt-1">Leave blank for no expiry</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
                <strong>Org scope:</strong> This key will grant access to all active organizations.
                Per-organization scoping can be configured after key creation.
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createKey.mutate()}
                  disabled={!newLabel.trim() || !newName.trim() || createKey.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createKey.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating…</> : <><Key className="h-4 w-4 mr-1.5" /> Generate Key</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = (user as any)?.role === "admin";
  // SuperAdmin = internal BCCS staff identified by @bccsworld.com email — license management only
  const isSuperAdmin = !!((user as any)?.email?.toLowerCase().endsWith("@bccsworld.com"));
  // Customer admins see everything except the license tab; SuperAdmins see only the license tab

  // ── license state (for Licenses tab)
  const { license, refetch: refetchLicense, canUse } = useLicense();
  const [licPlan, setLicPlan]             = useState<PlanKey>("trial");
  const [licStatus, setLicStatus]         = useState("trial");
  const [licSeats, setLicSeats]           = useState("5");
  const [licPeriodEnd, setLicPeriodEnd]   = useState("");
  const [licNotes, setLicNotes]           = useState("");
  const [licEditing, setLicEditing]       = useState(false);


  // ── modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [resetPwOpen, setResetPwOpen] = useState<UserRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserRecord | null>(null);
  const [newRoleOpen, setNewRoleOpen] = useState(false);

  // ── invite form
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast]   = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("viewer");
  const [invitePw, setInvitePw]       = useState("");
  const [showInvitePw, setShowInvitePw] = useState(false);

  // ── reset password form
  const [newPw, setNewPw]         = useState("");
  const [showNewPw, setShowNewPw] = useState(false);

  // ── new role form
  const [newRoleName, setNewRoleName]         = useState("");
  const [newRoleDisplay, setNewRoleDisplay]   = useState("");
  const [newRoleDesc, setNewRoleDesc]         = useState("");

  // ── user search / filter
  const [userSearch, setUserSearch]   = useState("");
  const [roleFilter, setRoleFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── selected role for permission editing
  const [selectedRole, setSelectedRole]       = useState<string>("admin");
  const [pendingPerms, setPendingPerms]        = useState<string[] | null>(null);
  const [permsDirty, setPermsDirty]           = useState(false);

  // ── queries
  const { data: stats } = useQuery({ queryKey: ["/api/admin/stats"], enabled: isAuthenticated });
  const { data: organizations } = useQuery({ queryKey: ["/api/organizations"], enabled: isAuthenticated });

  const {
    data: userList = [],
    isLoading: usersLoading,
  } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const {
    data: roleList = [],
    isLoading: rolesLoading,
  } = useQuery<RoleRecord[]>({
    queryKey: ["/api/admin/roles"],
    enabled: isAuthenticated && isAdmin,
  });

  // ── derived
  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email}`.toLowerCase();
      if (userSearch && !name.includes(userSearch.toLowerCase())) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active"   && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive)  return false;
      return true;
    });
  }, [userList, userSearch, roleFilter, statusFilter]);

  const activeRole = roleList.find((r) => r.role_name === selectedRole);
  const currentPerms: string[] = pendingPerms ?? activeRole?.permissions ?? [];

  function selectRole(roleName: string) {
    if (permsDirty) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    setSelectedRole(roleName);
    setPendingPerms(null);
    setPermsDirty(false);
  }

  function togglePermission(key: string) {
    const base = pendingPerms ?? activeRole?.permissions ?? [];
    const next = base.includes(key) ? base.filter((p) => p !== key) : [...base, key];
    setPendingPerms(next);
    setPermsDirty(true);
  }

  // ── mutations
  const inviteMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/users/invite", {
        email: inviteEmail, firstName: inviteFirst, lastName: inviteLast,
        role: inviteRole, temporaryPassword: invitePw,
      }),
    onSuccess: () => {
      toast({ title: "User invited", description: `${inviteEmail} added to the platform.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setInviteOpen(false);
      setInviteFirst(""); setInviteLast(""); setInviteEmail(""); setInvitePw(""); setInviteRole("viewer");
    },
    onError: (err: any) => toast({ title: "Invite failed", description: err.message, variant: "destructive" }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest("PUT", `/api/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PUT", `/api/admin/users/${id}/status`, { isActive }),
    onSuccess: (_, { isActive }) => {
      toast({ title: isActive ? "User activated" : "User deactivated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiRequest("PUT", `/api/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      toast({ title: "Password reset", description: "The user's password has been updated." });
      setResetPwOpen(null); setNewPw("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`, undefined),
    onSuccess: () => {
      toast({ title: "User removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteConfirm(null);
    },
    onError: () => toast({ title: "Failed to remove user", variant: "destructive" }),
  });

  const savePermsMutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", `/api/admin/roles/${selectedRole}`, { permissions: currentPerms }),
    onSuccess: () => {
      toast({ title: "Permissions saved", description: `${activeRole?.display_name} permissions updated.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setPendingPerms(null);
      setPermsDirty(false);
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const createRoleMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/roles", {
        roleName: newRoleName, displayName: newRoleDisplay, description: newRoleDesc,
      }),
    onSuccess: () => {
      toast({ title: "Role created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setNewRoleOpen(false);
      setNewRoleName(""); setNewRoleDisplay(""); setNewRoleDesc("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleName: string) => apiRequest("DELETE", `/api/admin/roles/${roleName}`, undefined),
    onSuccess: () => {
      toast({ title: "Role deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      if (selectedRole === deleteRoleMutation.variables) setSelectedRole("admin");
    },
    onError: (err: any) => toast({ title: "Cannot delete", description: err.message, variant: "destructive" }),
  });

  const saveLicenseMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/license", {
      plan: licPlan,
      status: licStatus,
      seatsLimit: parseInt(licSeats, 10),
      currentPeriodEnd: licPeriodEnd || null,
      notes: licNotes,
    }),
    onSuccess: () => {
      toast({ title: "License updated", description: `Plan set to ${PLAN_DISPLAY[licPlan].label}.` });
      queryClient.invalidateQueries({ queryKey: ["/api/license"] });
      refetchLicense();
      setLicEditing(false);
    },
    onError: (err: any) => toast({ title: "Failed to update license", description: err.message, variant: "destructive" }),
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm">Manage users, roles, permissions, and system configuration</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Invite User
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-2xl font-bold">{stats?.totalUsers ?? userList.length}</p>
                <p className="text-xs text-slate-400">
                  {userList.filter(u => u.isActive).length} active
                </p>
              </div>
              <Users className="h-9 w-9 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Roles</p>
                <p className="text-2xl font-bold">{roleList.length}</p>
                <p className="text-xs text-slate-400">
                  {roleList.filter(r => !r.is_system).length} custom
                </p>
              </div>
              <Shield className="h-9 w-9 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Organizations</p>
                <p className="text-2xl font-bold">{stats?.totalOrganizations ?? 0}</p>
                <p className="text-xs text-slate-400">Active organizations</p>
              </div>
              <Building className="h-9 w-9 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs — SuperAdmin sees only License; Customer Admin sees operational tabs */}
      <Tabs defaultValue={isSuperAdmin ? "license" : "users"} className="space-y-4">
        <TabsList className="flex flex-wrap w-full justify-start gap-2 h-auto p-2">
          {!isSuperAdmin && (
            <>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-1.5" /> Users
              </TabsTrigger>
              <TabsTrigger value="roles">
                <Shield className="h-4 w-4 mr-1.5" /> Roles &amp; Permissions
                {!canUse('customRoles') && <LockedBadge />}
              </TabsTrigger>
              <TabsTrigger value="organizations">
                <Building className="h-4 w-4 mr-1.5" /> Organizations
              </TabsTrigger>
              <TabsTrigger value="system">
                <Settings className="h-4 w-4 mr-1.5" /> System
              </TabsTrigger>
            </>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="license">
              <CreditCard className="h-4 w-4 mr-1.5" /> License
            </TabsTrigger>
          )}
          {isAdmin && !isSuperAdmin && (
            <TabsTrigger value="api-keys">
              <Key className="h-4 w-4 mr-1.5" /> API Keys
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── USERS TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Invite users, assign roles, manage account status</CardDescription>
                </div>
                {isAdmin && (
                  <Button size="sm" onClick={() => setInviteOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-1.5" /> Invite
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <div className="py-10 text-center text-slate-500">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  Admin access required
                </div>
              ) : (
                <>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by name or email…"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        {roleList.map(r => (
                          <SelectItem key={r.role_name} value={r.role_name}>{r.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 w-32">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Table */}
                  {usersLoading ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading users…
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No users match the current filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-slate-400 uppercase tracking-wide">
                            <th className="text-left py-2 pr-4 font-medium">User</th>
                            <th className="text-left py-2 pr-4 font-medium">Role</th>
                            <th className="text-left py-2 pr-4 font-medium hidden sm:table-cell">Status</th>
                            <th className="text-left py-2 pr-4 font-medium hidden md:table-cell">Last Login</th>
                            <th className="text-left py-2 pr-4 font-medium hidden lg:table-cell">Joined</th>
                            <th className="text-right py-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.map((u) => (
                            <UserRow
                              key={u.id}
                              user={u}
                              currentUserId={(user as any)?.id}
                              roleList={roleList}
                              onRoleChange={(role) => roleMutation.mutate({ id: u.id, role })}
                              onToggleActive={() => statusMutation.mutate({ id: u.id, isActive: !u.isActive })}
                              onResetPassword={() => { setResetPwOpen(u); setNewPw(""); }}
                              onDelete={() => setDeleteConfirm(u)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ROLES & PERMISSIONS TAB ───────────────────────────────────── */}
        <TabsContent value="roles">
          <FeatureGate feature="customRoles" featureLabel="Custom Roles & Permissions">
          {!isAdmin ? (
            <Card>
              <CardContent className="py-10 text-center text-slate-500">
                <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                Admin access required
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Role list */}
              <div className="lg:col-span-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Roles</h3>
                  <Button size="sm" variant="outline" onClick={() => setNewRoleOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> New Role
                  </Button>
                </div>
                {rolesLoading ? (
                  <div className="py-4 text-center text-slate-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (
                  roleList.map((role) => {
                    const rd = getRoleDisplay(role.role_name);
                    const userCount = userList.filter(u => u.role === role.role_name).length;
                    const isSelected = selectedRole === role.role_name;
                    return (
                      <button
                        key={role.role_name}
                        onClick={() => selectRole(role.role_name)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={`${rd.color} border-0 text-xs`}>{role.display_name}</Badge>
                              {role.is_system && (
                                <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 truncate">{role.description}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {role.permissions.length} permissions · {userCount} user{userCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {isSelected && <ChevronRight className="h-4 w-4 text-blue-500 shrink-0 mt-1" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right: Permission matrix */}
              <div className="lg:col-span-2">
                {activeRole ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-blue-600" />
                            {activeRole.display_name} Permissions
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {activeRole.is_system
                              ? "System role — you can still customize its permissions"
                              : "Custom role — configure permissions freely"}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {permsDirty && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setPendingPerms(null); setPermsDirty(false); }}
                            >
                              Discard
                            </Button>
                          )}
                          <Button
                            size="sm"
                            disabled={!permsDirty || savePermsMutation.isPending}
                            onClick={() => savePermsMutation.mutate()}
                          >
                            {savePermsMutation.isPending ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
                            ) : "Save Changes"}
                          </Button>
                          {!activeRole.is_system && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (confirm(`Delete role "${activeRole.display_name}"? This cannot be undone.`)) {
                                  deleteRoleMutation.mutate(activeRole.role_name);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Shortcut: grant all / clear all */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { setPendingPerms([...ALL_PERMISSIONS]); setPermsDirty(true); }}
                          disabled={activeRole.role_name === "admin"}
                        >
                          Grant All
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700"
                          onClick={() => {
                            const keep = activeRole.role_name === "admin" ? ["admin:roles"] : [];
                            setPendingPerms(keep);
                            setPermsDirty(true);
                          }}
                          disabled={activeRole.role_name === "admin"}
                        >
                          Clear All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {PERMISSION_GROUPS.map((group) => {
                        const groupPerms = PERMISSION_DEFINITIONS.filter((p) => p.group === group);
                        if (groupPerms.length === 0) return null;
                        const allOn = groupPerms.every((p) => currentPerms.includes(p.key));
                        const someOn = groupPerms.some((p) => currentPerms.includes(p.key));
                        return (
                          <div key={group}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                {group}
                              </h4>
                              <button
                                className="text-xs text-blue-600 hover:underline"
                                disabled={activeRole.role_name === "admin"}
                                onClick={() => {
                                  const keys = groupPerms.map(p => p.key);
                                  const base = pendingPerms ?? activeRole.permissions ?? [];
                                  const next = allOn
                                    ? base.filter(p => !keys.includes(p))
                                    : [...new Set([...base, ...keys])];
                                  setPendingPerms(next);
                                  setPermsDirty(true);
                                }}
                              >
                                {allOn ? "Remove all" : "Grant all"}
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {groupPerms.map((perm) => {
                                const granted = currentPerms.includes(perm.key);
                                const locked = activeRole.role_name === "admin";
                                return (
                                  <div
                                    key={perm.key}
                                    className={`flex items-center justify-between p-2 rounded-md border ${
                                      granted
                                        ? "bg-blue-50 border-blue-200"
                                        : "bg-slate-50 border-slate-200"
                                    }`}
                                  >
                                    <div className="min-w-0 mr-4">
                                      <p className={`text-sm font-medium ${granted ? "text-blue-900" : "text-slate-600"}`}>
                                        {perm.label}
                                      </p>
                                      <p className="text-xs text-slate-400 truncate">{perm.description}</p>
                                    </div>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div>
                                          <Switch
                                            id={`perm-switch-${perm.key}`}
                                            aria-label={perm.label}
                                            checked={granted}
                                            disabled={locked}
                                            onCheckedChange={() => togglePermission(perm.key)}
                                            className={granted ? "data-[state=checked]:bg-blue-600" : ""}
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      {locked && (
                                        <TooltipContent>Admin always has all permissions</TooltipContent>
                                      )}
                                    </Tooltip>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                    Select a role on the left to edit its permissions
                  </div>
                )}
              </div>
            </div>
          )}
          </FeatureGate>
        </TabsContent>

        {/* ── ORGANIZATIONS TAB ─────────────────────────────────────────── */}
        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>Configure your registered training organization</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(organizations) && organizations.length > 0 ? (
                <div className="space-y-3">
                  {organizations.map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{org.organizationName}</p>
                        <p className="text-sm text-slate-500">
                          {org.organizationType?.replace(/_/g, " ").toUpperCase()} ·{" "}
                          {org.regulatoryAuthority}
                        </p>
                        {org.certificateNumber && (
                          <p className="text-xs text-slate-400">Cert: {org.certificateNumber}</p>
                        )}
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No organization configured yet.</p>
                  <Button variant="outline" onClick={() => window.location.href = "/organization-setup"}>
                    <Plus className="h-4 w-4 mr-2" /> Set Up Organization
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LICENSE TAB ───────────────────────────────────────────────── */}
        {isSuperAdmin && (
          <TabsContent value="license">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      License Management
                    </CardTitle>
                    <CardDescription>
                      View and manage the platform license plan and status
                    </CardDescription>
                  </div>
                  {!licEditing && (
                    <Button size="sm" variant="outline" onClick={() => {
                      if (license) {
                        setLicPlan(license.plan);
                        setLicStatus(license.status);
                        setLicSeats(String(license.seatsLimit));
                        setLicPeriodEnd(license.currentPeriodEnd ? license.currentPeriodEnd.split('T')[0] : "");
                        setLicNotes(license.notes ?? "");
                      }
                      setLicEditing(true);
                    }}>
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current license display */}
                {license && !licEditing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Current Plan</p>
                        <div className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold ${PLAN_DISPLAY[license.plan]?.color ?? "bg-slate-100 text-slate-700"}`}>
                          <Zap className="h-3.5 w-3.5" />
                          {PLAN_DISPLAY[license.plan]?.label ?? license.plan}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Status</p>
                        <Badge className={
                          license.status === 'active' ? 'bg-green-100 text-green-700 border-0' :
                          license.status === 'trial'  ? 'bg-sky-100 text-sky-700 border-0' :
                          license.status === 'suspended' ? 'bg-red-100 text-red-700 border-0' :
                          'bg-amber-100 text-amber-700 border-0'
                        }>
                          {license.status.charAt(0).toUpperCase() + license.status.slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Seat Limit</p>
                        <p className="text-sm font-medium text-slate-800">
                          {license.seatsLimit === -1 ? "Unlimited" : `${license.seatsLimit} users`}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {license.currentPeriodEnd && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Expires / Renews</p>
                          <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {format(new Date(license.currentPeriodEnd), "MMMM d, yyyy")}
                          </p>
                        </div>
                      )}
                      {license.stripeSubscriptionId && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Stripe Subscription</p>
                          <p className="text-xs font-mono text-slate-600 break-all">{license.stripeSubscriptionId}</p>
                        </div>
                      )}
                      {license.assignedBy && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Last Updated By</p>
                          <p className="text-sm text-slate-700">{license.assignedBy}</p>
                        </div>
                      )}
                      {license.notes && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Notes</p>
                          <p className="text-sm text-slate-600 italic">{license.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit form */}
                {licEditing && (
                  <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                    <h3 className="font-semibold text-slate-800 text-sm">Update License</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs mb-1 block">Plan</Label>
                        <Select value={licPlan} onValueChange={(v) => setLicPlan(v as PlanKey)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial (30 days, 5 users)</SelectItem>
                            <SelectItem value="standard">Standard — $4,000/yr (15 users)</SelectItem>
                            <SelectItem value="professional">Professional — $9,000/yr (50 users)</SelectItem>
                            <SelectItem value="enterprise">Enterprise — $20,000/yr (unlimited)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Status</Label>
                        <Select value={licStatus} onValueChange={setLicStatus}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Seats Limit (override)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={licSeats}
                          onChange={e => setLicSeats(e.target.value)}
                          className="h-9"
                          placeholder="e.g. 15"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">License Expiry Date</Label>
                        <Input
                          type="date"
                          value={licPeriodEnd}
                          onChange={e => setLicPeriodEnd(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Internal Notes</Label>
                      <Input
                        value={licNotes}
                        onChange={e => setLicNotes(e.target.value)}
                        placeholder="e.g. Extended trial per CEO approval, 2026-06-01"
                        className="h-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={saveLicenseMutation.isPending}
                        onClick={() => saveLicenseMutation.mutate()}
                      >
                        {saveLicenseMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Save License
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setLicEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Feature matrix for selected plan */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                    Features — {PLAN_DISPLAY[licEditing ? licPlan : (license?.plan ?? 'trial')]?.label ?? "Trial"} Plan
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(PLAN_FEATURES[licEditing ? licPlan : (license?.plan ?? 'trial')] ?? {}).map(([key, val]) => {
                      const label = key.replace(/([A-Z])/g, ' $1').trim();
                      const enabled = typeof val === 'boolean' ? val : (val as number) !== 0;
                      return (
                        <div key={key} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border ${enabled ? 'border-green-200 bg-green-50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                          {enabled
                            ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                            : <XCircle className="h-3 w-3 text-slate-300 shrink-0" />}
                          {label}{typeof val === 'number' && val !== -1 && val !== 0 ? `: ${val}` : typeof val === 'number' && val === -1 ? ': ∞' : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── SYSTEM TAB ────────────────────────────────────────────────── */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Platform-level settings and module configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: "AI Confidence Threshold", desc: "85% minimum confidence for AI processing" },
                  { label: "OCR Processing",           desc: "Tesseract + OpenAI GPT-4o" },
                  { label: "Blockchain Hashing",       desc: "SHA-256 immutable record hashing" },
                  { label: "Backup & Security",        desc: "Daily automated database backups" },
                  { label: "Session Timeout",          desc: "7-day session expiry" },
                  { label: "FAA Monitor Schedule",     desc: "Checks every 6 hours" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API KEYS TAB ───────────────────────────────────────────────── */}
        {isAdmin && (
          <TabsContent value="api-keys">
            <ReviewerKeysPanel />
          </TabsContent>
        )}
      </Tabs>

      {/* ── INVITE DIALOG ─────────────────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Invite New User
            </DialogTitle>
            <DialogDescription>
              They will log in with this email and the temporary password you set.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name</Label>
                <Input value={inviteFirst} onChange={e => setInviteFirst(e.target.value)} placeholder="First" />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input value={inviteLast} onChange={e => setInviteLast(e.target.value)} placeholder="Last" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email Address</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@training.com" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleList.map(r => (
                    <SelectItem key={r.role_name} value={r.role_name}>
                      <span className="font-medium">{r.display_name}</span>
                      <span className="text-slate-400 ml-2 text-xs">{r.permissions.length} permissions</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inviteRole && (
                <p className="text-xs text-slate-400 mt-1">
                  {roleList.find(r => r.role_name === inviteRole)?.description}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Temporary Password</Label>
              <div className="relative">
                <Input
                  type={showInvitePw ? "text" : "password"}
                  value={invitePw}
                  onChange={e => setInvitePw(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowInvitePw(s => !s)}
                >
                  {showInvitePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">User should change this on first login.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !inviteEmail || !inviteFirst || !inviteLast || invitePw.length < 8}
            >
              {inviteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Inviting…</> : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESET PASSWORD DIALOG ─────────────────────────────────────────── */}
      <Dialog open={!!resetPwOpen} onOpenChange={(o) => !o && setResetPwOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new temporary password for{" "}
              <span className="font-medium">{resetPwOpen?.firstName ?? resetPwOpen?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs">New Password</Label>
            <div className="relative mt-1">
              <Input
                type={showNewPw ? "text" : "password"}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                onClick={() => setShowNewPw(s => !s)}
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwOpen(null)}>Cancel</Button>
            <Button
              disabled={newPw.length < 8 || resetPwMutation.isPending}
              onClick={() => resetPwMutation.mutate({ id: resetPwOpen!.id, newPassword: newPw })}
            >
              {resetPwMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM DIALOG ─────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Delete User
            </DialogTitle>
            <DialogDescription>
              Permanently delete <span className="font-medium">{deleteConfirm?.email}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirm!.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NEW ROLE DIALOG ───────────────────────────────────────────────── */}
      <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Create Custom Role
            </DialogTitle>
            <DialogDescription>
              Define a new role. You can set its permissions after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs">Role Name (internal key)</Label>
              <Input
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="e.g. lead_instructor"
              />
              <p className="text-xs text-slate-400 mt-0.5">Lowercase letters, numbers, _ or - only</p>
            </div>
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input value={newRoleDisplay} onChange={e => setNewRoleDisplay(e.target.value)} placeholder="Lead Instructor" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} placeholder="Brief description…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoleOpen(false)}>Cancel</Button>
            <Button
              disabled={!newRoleName || !newRoleDisplay || createRoleMutation.isPending}
              onClick={() => createRoleMutation.mutate()}
            >
              {createRoleMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── UserRow sub-component ──────────────────────────────────────────────────

function UserRow({
  user: u,
  currentUserId,
  roleList,
  onRoleChange,
  onToggleActive,
  onResetPassword,
  onDelete,
}: {
  user: UserRecord;
  currentUserId: string;
  roleList: RoleRecord[];
  onRoleChange: (role: string) => void;
  onToggleActive: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const isSelf = u.id === currentUserId;

  return (
    <tr className="hover:bg-slate-50 group">
      <td className="py-3 pr-4">
        <p className="font-medium text-slate-900 text-sm">
          {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : "—"}
          {isSelf && <span className="ml-1 text-xs text-blue-500">(you)</span>}
        </p>
        <p className="text-xs text-slate-400">{u.email}</p>
      </td>
      <td className="py-3 pr-4">
        <Select defaultValue={u.role} onValueChange={onRoleChange} disabled={isSelf}>
          <SelectTrigger className="h-7 w-32 text-xs border-0 bg-transparent p-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
            <SelectValue>
              <RoleBadge role={u.role} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {roleList.map(r => (
              <SelectItem key={r.role_name} value={r.role_name} className="text-xs">
                {r.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-3 pr-4 hidden sm:table-cell">
        <StatusBadge isActive={u.isActive} />
      </td>
      <td className="py-3 pr-4 hidden md:table-cell">
        <span className="text-xs text-slate-500">
          {u.lastLoginAt
            ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true })
            : <span className="text-slate-300">Never</span>}
        </span>
      </td>
      <td className="py-3 pr-4 hidden lg:table-cell">
        <span className="text-xs text-slate-400">
          {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}
        </span>
      </td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm"
                className={`h-7 w-7 p-0 ${u.isActive ? "text-amber-500 hover:text-amber-700" : "text-green-500 hover:text-green-700"}`}
                disabled={isSelf}
                onClick={onToggleActive}
              >
                {u.isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{u.isActive ? "Deactivate account" : "Activate account"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700" onClick={onResetPassword}>
                <KeyRound className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset password</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm"
                className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                disabled={isSelf}
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete user</TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}
