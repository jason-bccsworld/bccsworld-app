import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Shield, Database, Globe, Download, Trash2, Key, Loader2 } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/user', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load user');
      return res.json();
    }
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setEmail(userData.email || '');
    }
  }, [userData]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email })
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: 'Profile updated', description: 'Your profile has been saved.' });
    },
    onError: () => {
      toast({ title: 'Update failed', description: 'Could not save changes.', variant: 'destructive' });
    }
  });

  const handleCancel = () => {
    setFirstName(userData?.firstName || '');
    setLastName(userData?.lastName || '');
    setEmail(userData?.email || '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your BCCS-US platform preferences and configurations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input value={userData?.role || ''} readOnly className="bg-muted capitalize" />
                </div>
                <Button className="w-full" onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Update Profile'}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-600" />
              Notifications
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="compliance-alerts">Compliance Alerts</Label>
              <Switch id="compliance-alerts" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="document-updates">Document Updates</Label>
              <Switch id="document-updates" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="system-maintenance">System Maintenance</Label>
              <Switch id="system-maintenance" />
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Security
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <Switch id="two-factor" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-logout (minutes)</Label>
              <Select defaultValue="30">
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="120">120</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full">
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>
        </Card>
      </div>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-600" />
            Regional Settings
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Timezone</Label>
              <Select defaultValue="UTC-5">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                  <SelectItem value="UTC-7">Mountain Time (UTC-7)</SelectItem>
                  <SelectItem value="UTC-6">Central Time (UTC-6)</SelectItem>
                  <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="UTC+1">Central European (UTC+1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select defaultValue="en-US">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Format</Label>
              <Select defaultValue="MM/DD/YYYY">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            Data Management
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export Data</Button>
            <Button variant="outline"><Download className="h-4 w-4 mr-2" />Download Compliance Report</Button>
            <Button variant="outline"><Download className="h-4 w-4 mr-2" />Backup Settings</Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Clear Cache</Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
        <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
          {profileMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
