import React, { useState } from 'react';
import { Settings, User, Building, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';

export function SettingsPage() {
  const { user, currentOrg } = useAuth();
  const { success } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [orgName, setOrgName] = useState(currentOrg?.name || '');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    success('Settings Saved', 'Profile information updated.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization & Account Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage tenant configuration, members, credentials, and profile.
        </p>
      </div>

      {/* Organization Settings */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Building className="w-5 h-5 text-primary" />
          <CardTitle className="text-sm font-bold">Organization Tenant</CardTitle>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <Input label="Tenant Slug" value={currentOrg?.slug || ''} disabled hint="Immutable tenant identifier" />
        </div>
      </Card>

      {/* User Profile */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <User className="w-5 h-5 text-primary" />
          <CardTitle className="text-sm font-bold">User Profile</CardTitle>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email Address" value={user?.email || ''} disabled />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
