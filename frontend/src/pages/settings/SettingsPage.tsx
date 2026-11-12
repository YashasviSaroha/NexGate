import React, { useEffect, useState } from 'react';
import { User, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';

export function SettingsPage() {
  const { user, currentOrg, refreshUser, switchOrg } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DEVELOPER');
  const [updatePassword, setUpdatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    apiClient
      .get(`/api/v1/organizations/${currentOrg.id}/members`)
      .then((res) => setMembers(res.data?.data || []))
      .catch(() => setMembers([]));
  }, [currentOrg]);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setIsSavingOrg(true);
    try {
      await apiClient.put(`/api/v1/organizations/${currentOrg.id}`, { name: orgName });
      switchOrg({ ...currentOrg, name: orgName });
      success('Organization saved', 'The organization name was updated.');
    } catch (err: any) {
      error('Save Failed', err.response?.data?.error?.message || 'Could not update the organization.');
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setIsInviting(true);
    try {
      await apiClient.post(`/api/v1/organizations/${currentOrg.id}/members/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      const res = await apiClient.get(`/api/v1/organizations/${currentOrg.id}/members`);
      setMembers(res.data?.data || []);
      success('Member added', 'That account is now in this organization.');
    } catch (err: any) {
      error('Invite failed', err.response?.data?.error?.message || 'The member was not added.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await apiClient.put('/api/v1/auth/me', { name });
      await refreshUser();
      success('Settings Saved', 'Profile information updated.');
    } catch (err: any) {
      error('Save Failed', err.response?.data?.error?.message || 'Could not update your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updatePassword !== confirmPassword) {
      error('Password Mismatch', 'Update password and confirm password do not match.');
      return;
    }
    if (updatePassword.length < 8) {
      error('Password Too Short', 'Password must be at least 8 characters.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await apiClient.put('/api/v1/auth/me', {
        newPassword: updatePassword,
      });
      setUpdatePassword('');
      setConfirmPassword('');
      success('Password Updated', 'Your password has been changed.');
    } catch (err: any) {
      error('Update Failed', err.response?.data?.error?.message || 'Could not change your password.');
    } finally {
      setIsSavingPassword(false);
    }
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

        <form onSubmit={handleSaveOrg} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={user?.demo} />
            <Input label="Tenant Slug" value={currentOrg?.slug || ''} disabled hint="Immutable tenant identifier" />
          </div>
          {user?.demo ? (
            <CardDescription>Organization changes are unavailable in the demo workspace.</CardDescription>
          ) : (
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSavingOrg}>Save Organization</Button>
            </div>
          )}
        </form>

        <div className="space-y-3 pt-4 border-t border-border">
          <CardDescription>Members</CardDescription>
          <ul className="space-y-1 text-xs">
            {members.map((member) => (
              <li key={member.id} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span>{member.user?.email || member.inviteEmail}</span>
                <span className="font-semibold text-muted-foreground">{member.role}</span>
              </li>
            ))}
            {members.length === 0 && <li className="text-muted-foreground">No members loaded.</li>}
          </ul>
          {user?.demo ? (
            <CardDescription>Invites are unavailable in the demo workspace. The person must already have a NexGate account.</CardDescription>
          ) : (
            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3 items-end">
              <Input
                label="Account email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
              <label className="space-y-1.5 text-xs font-semibold text-foreground/85">
                Role
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-normal"
                >
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <Button type="submit" isLoading={isInviting}>Add member</Button>
            </form>
          )}
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
            <Button type="submit" isLoading={isSavingProfile}>Save Changes</Button>
          </div>
        </form>

        <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-border">
          {user?.demo ? (
            <CardDescription>Password changes are unavailable in the demo workspace.</CardDescription>
          ) : (
            <>
              <CardDescription>Choose a new password for this account.</CardDescription>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Update password"
                  type="password"
                  value={updatePassword}
                  onChange={(e) => setUpdatePassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <Input
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter the new password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSavingPassword}>Update Password</Button>
              </div>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}
