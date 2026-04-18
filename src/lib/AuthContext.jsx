import { supabase } from '../lib/supabase';

import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(/** @type {any} */ (null));

/** @param {{ children: React.ReactNode }} props */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(/** @type {any} */ (null));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
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

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      setUser(user ?? null);
      setIsAuthenticated(!!user);
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
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
    setIsAuthenticated(false);
    setAuthChecked(true);

    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      signInWithGoogle,
      checkUserAuth,
      checkAppState
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
