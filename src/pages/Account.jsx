// @ts-nocheck
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogOut, UserCircle2, ShieldCheck, Users, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Ensure this path is correct for Sykle

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

  // Admin States
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (profile || user) {
      setFormValues({
        full_name: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        avatar_url: profile?.avatar_url || user?.user_metadata?.picture || '',
        email: profile?.email || user?.email || '',
      });
      
      // Fetch users if the current user is an admin
      if (profile?.is_admin) {
        fetchUsers();
      }
    }
  }, [profile, user]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (!error) setAllUsers(data);
    setLoadingUsers(false);
  };

  const handleUpdateUserPoints = async (userId, newPoints) => {
    const { error } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId);

    if (!error) {
      setMessage('User updated successfully');
      fetchUsers();
    } else {
      setMessage('Error updating user');
    }
  };

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
        {/* Profile Header */}
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Account</p>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold">My Profile</h1>
                {profile?.is_admin && <ShieldCheck className="text-primary" size={24} title="Admin Account" />}
              </div>
            </div>
            <Button variant="outline" onClick={() => logout()} className="gap-2">
              <LogOut size={16} /> Sign out
           </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
<div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
  <div className="space-y-4">
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
        {formValues.avatar_url ? (
          <img 
            src={formValues.avatar_url} 
            alt={formValues.full_name} 
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-2xl font-bold text-primary">
            {formValues.full_name?.charAt(0) || 'A'}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Logged in as</p>
        <p className="text-lg font-semibold">{formValues.email}</p>
      </div>
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

        {/* Admin Management Section - Only visible to Admins */}
        {profile?.is_admin && (
          <div className="bg-card rounded-3xl border-2 border-primary/20 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Users className="text-primary" />
              <h2 className="text-2xl font-semibold">Admin: User Management</h2>
            </div>
            
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                className="pl-10" 
                placeholder="Search users by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {loadingUsers ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
              ) : (
                allUsers
                  .filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((userItem) => (
                    <div key={userItem.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border gap-4">
                      <div>
                        <p className="font-medium">{userItem.full_name || 'Unnamed User'}</p>
                        <p className="text-xs text-muted-foreground">{userItem.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground font-bold ml-1">Seeds</span>
                          <Input 
                            type="number" 
                            className="w-24 h-9" 
                            defaultValue={userItem.points} 
                            onBlur={(e) => handleUpdateUserPoints(userItem.id, parseInt(e.target.value))}
                          />
                        </div>
                        <Button size="sm" variant="ghost" className="mt-4">Edit Profile</Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Personal Settings Form */}
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <div>
                {message && <p className="text-sm font-medium text-primary">{message}</p>}
                {isLoadingProfile && <p className="text-sm text-muted-foreground">Loading account details...</p>}
              </div>
              <Button type="submit" disabled={saving || isLoadingProfile} className="gap-2 px-8">
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}