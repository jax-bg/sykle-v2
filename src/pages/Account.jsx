// @ts-nocheck
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogOut, UserCircle2 } from 'lucide-react';

export default function Account() {
  const {
    user,
    profile,
    isAuthenticated,
    isLoadingAuth,
    isLoadingProfile,
    logout,
    updateProfile,
  } = useAuth();

  const [formValues, setFormValues] = useState({
    full_name: '',
    avatar_url: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile || user) {
      setFormValues({
        full_name: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        avatar_url: profile?.avatar_url || user?.user_metadata?.picture || '',
        email: profile?.email || user?.email || '',
      });
    }
  }, [profile, user]);

  const canEdit = isAuthenticated && !isLoadingAuth;

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setMessage('');

    try {
      await updateProfile({
        full_name: formValues.full_name,
        avatar_url: formValues.avatar_url,
      });
      setMessage('Profile saved!');
    } catch (err) {
      setMessage(err?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
          <UserCircle2 size={40} className="mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-semibold mb-2">Account required</h1>
          <p className="text-sm text-muted-foreground mb-6">Please sign in to view and manage your account.</p>
          <Button onClick={() => window.location.href = '/login'} className="w-full">Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Account</p>
              <h1 className="text-3xl font-semibold">My Profile</h1>
            </div>
            <Button variant="outline" onClick={() => logout()} className="gap-2">
              <LogOut size={16} /> Sign out
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Full name</span>
                <Input
                  value={formValues.full_name}
                  onChange={(event) => setFormValues({ ...formValues, full_name: event.target.value })}
                  placeholder="Your name"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Avatar URL</span>
                <Input
                  value={formValues.avatar_url}
                  onChange={(event) => setFormValues({ ...formValues, avatar_url: event.target.value })}
                  placeholder="https://..."
                />
              </label>
            </div>
            <label className="space-y-2 text-sm font-medium">
              <span>Email</span>
              <Input value={formValues.email} readOnly />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {message && <p className="text-sm text-muted-foreground">{message}</p>}
                {isLoadingProfile && <p className="text-sm text-muted-foreground">Loading account details...</p>}
              </div>
              <Button type="submit" disabled={saving || isLoadingProfile} className="gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save profile'}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl text-primary">
                {formValues.full_name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Logged in as</p>
                <p className="text-lg font-semibold">{formValues.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Lifetime points</p>
                <p className="mt-2 text-2xl font-semibold">{profile?.lifetime_points ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Seeds balance</p>
                <p className="mt-2 text-2xl font-semibold">{profile?.points ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Current streak</p>
                <p className="mt-2 text-2xl font-semibold">{profile?.current_streak ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
