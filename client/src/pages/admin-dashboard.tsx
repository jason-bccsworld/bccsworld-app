import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Building, Plus, ChevronRight, Loader2, Trash2, Shield, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-100 text-red-700" },
  { value: "auditor", label: "Auditor", color: "bg-purple-100 text-purple-700" },
  { value: "instructor", label: "Instructor", color: "bg-blue-100 text-blue-700" },
  { value: "viewer", label: "Viewer", color: "bg-gray-100 text-gray-700" },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(x => x.value === role) || ROLES[3];
  return <Badge className={`${r.color} border-0 text-xs`}>{r.label}</Badge>;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [invitePassword, setInvitePassword] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ["/api/organizations"],
    enabled: isAuthenticated,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  const { data: userList = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && (user as any)?.role === "admin",
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/users/invite", {
        email: inviteEmail,
        firstName: inviteFirst,
        lastName: inviteLast,
        role: inviteRole,
        temporaryPassword: invitePassword,
      }),
    onSuccess: () => {
      toast({ title: "User invited", description: `${inviteEmail} has been added to the platform.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setInviteOpen(false);
      setInviteEmail(""); setInviteFirst(""); setInviteLast(""); setInvitePassword(""); setInviteRole("viewer");
    },
    onError: (err: any) => {
      toast({ title: "Invite failed", description: err.message || "Could not create user.", variant: "destructive" });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest("PUT", `/api/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`, undefined),
    onSuccess: () => {
      toast({ title: "User removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({ title: "Failed to remove user", variant: "destructive" });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isAdmin = (user as any)?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600">Manage organizations and system configuration</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
                <p className="text-xs text-slate-600">Active organizations</p>
              </div>
              <Building className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-slate-600">System users</p>
              </div>
              <Users className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">98%</div>
                <p className="text-xs text-slate-600">System uptime</p>
              </div>
              <Settings className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap w-full justify-start gap-2 h-auto p-2">
          <TabsTrigger value="overview" className="flex-1 min-w-0">Overview</TabsTrigger>
          <TabsTrigger value="users" className="flex-1 min-w-0">Users</TabsTrigger>
          <TabsTrigger value="organizations" className="flex-1 min-w-0">Organizations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Registered training organizations</CardDescription>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="py-4 text-center text-sm text-slate-500">Loading…</div>
              ) : Array.isArray(organizations) && organizations.length > 0 ? (
                <div className="space-y-3">
                  {organizations.slice(0, 5).map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{org.organizationName}</div>
                        <div className="text-sm text-slate-600">{org.organizationType?.replace("_", " ").toUpperCase()}</div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-4 text-sm">No organizations registered yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Invite, manage roles, and remove users</CardDescription>
                </div>
                {isAdmin && (
                  <Button size="sm" onClick={() => setInviteOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" /> Invite
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <div className="py-8 text-center text-slate-500">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  Admin access required to manage users
                </div>
              ) : usersLoading ? (
                <div className="py-4 text-center text-sm text-slate-500">Loading users…</div>
              ) : (
                <div className="space-y-2">
                  {userList.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">
                          {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <RoleBadge role={u.role} />
                        {isAdmin && (
                          <>
                            <Select
                              defaultValue={u.role}
                              onValueChange={(role) => roleMutation.mutate({ id: u.id, role })}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map(r => (
                                  <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() => {
                                if (confirm(`Remove ${u.email} from the platform?`)) {
                                  deleteMutation.mutate(u.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {userList.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-sm">No users found.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>Detailed organization configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Organization Management</h3>
                <p className="text-slate-600 mb-4">Use the Organization Setup page to register or view your training organization.</p>
                <Button variant="outline" onClick={() => window.location.href = "/organization-setup"}>
                  <Plus className="w-4 h-4 mr-2" />
                  Go to Organization Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Configure system modules and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "AI Confidence Threshold", desc: "85% minimum confidence" },
              { label: "OCR Processing", desc: "Tesseract + OpenAI" },
              { label: "Blockchain Settings", desc: "SHA-256 hashing" },
              { label: "Backup & Security", desc: "Daily automated backups" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm text-slate-600">{item.desc}</div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Invite New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input value={inviteFirst} onChange={e => setInviteFirst(e.target.value)} placeholder="First" />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={inviteLast} onChange={e => setInviteLast(e.target.value)} placeholder="Last" />
              </div>
            </div>
            <div>
              <Label>Email Address</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@org.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Temporary Password</Label>
              <Input
                type="password"
                value={invitePassword}
                onChange={e => setInvitePassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
              <p className="text-xs text-slate-500 mt-1">User should change this on first login.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={
                inviteMutation.isPending ||
                !inviteEmail || !inviteFirst || !inviteLast || invitePassword.length < 8
              }
            >
              {inviteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Inviting…</> : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
