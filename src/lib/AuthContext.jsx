import { supabase } from '../lib/supabase';
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(/** @type {any} */ (null));

function isTableNotFoundError(error) {
  const message = error?.message || '';
  return /(does not exist|relation .* does not exist|table .* does not exist)/i.test(message);
}

async function fetchOrCreateProfile(user) {
  if (!user?.id) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error && !isTableNotFoundError(error)) {
    console.error('Profile load failed:', error);
    throw error;
  }

  if (profile) {
    return profile;
  }

  if (error && isTableNotFoundError(error)) {
    return null;
  }

  const defaultProfile = {
    id: user.id,
    email: user.email || null,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
    avatar_url: user.user_metadata?.picture || user.user_metadata?.avatar_url || null,
    lifetime_points: 0,
    points: 0,
    current_streak: 0,
    last_log_date: null,
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from('profiles')
    .upsert(defaultProfile, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (insertError && !isTableNotFoundError(insertError)) {
    console.error('Creating profile failed:', insertError);
    throw insertError;
  }

  return insertError && isTableNotFoundError(insertError) ? defaultProfile : insertedProfile;
}

/** @param {{ children: React.ReactNode }} props */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(/** @type {any} */ (null));
  const [profile, setProfile] = useState(/** @type {any} */ (null));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [authError, setAuthError] = useState(/** @type {any} */ (null));
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      await checkUserAuth();
    } catch (error) {
      console.error('App state check failed:', error);
      const err = /** @type {any} */ (error);
      setAuthError({
        type: 'unknown',
        message: err?.message || 'Authentication check failed.'
      });
    } finally {
      setIsLoadingPublicSettings(false);
    }
  };

  const loadUserProfile = async (sessionUser) => {
    setIsLoadingProfile(true);
    try {
      const profileData = await fetchOrCreateProfile(sessionUser);
      setProfile(profileData);
    } catch (error) {
      setProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData?.session) {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        return;
      }

      const {
        data: { user: sessionUser },
        error
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      setUser(sessionUser ?? null);
      setIsAuthenticated(!!sessionUser);
      if (sessionUser) {
        await loadUserProfile(sessionUser);
      }
    } catch (error) {
      const err = /** @type {any} */ (error);
      if (err?.message?.includes('Auth session missing')) {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
      } else {
        console.error('User auth check failed:', error);
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`
      }
    });

    if (error) {
      throw error;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const logout = async (shouldRedirect = true) => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }

    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setAuthChecked(true);

    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const updateProfile = async (updates) => {
    if (!user?.id) {
      throw new Error('Not authenticated');
    }

    const payload = {
      id: user.id,
      ...updates,
      email: updates.email || user.email,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Profile update failed:', error);
      throw error;
    }

    setProfile(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingProfile,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      signInWithGoogle,
      checkUserAuth,
      checkAppState,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
