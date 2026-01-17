'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseAuthApi } from '@/lib/supabase-api';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Admin } from '@/lib/database.types';

interface AuthContextType {
  user: SupabaseUser | null;
  admin: Admin | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<Admin>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch admin profile without blocking - used by multiple places
  const fetchAdminProfile = async (userId: string) => {
    try {
      const { data: adminData, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && adminData) {
        setAdmin(adminData);
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    }
  };

  // Check if user is logged in on mount and listen for auth changes
  useEffect(() => {
    // Get initial session - optimized to unblock UI fast
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        // Set session and user immediately
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Unblock UI immediately - don't wait for admin profile
        setLoading(false);

        // Fetch admin profile asynchronously (non-blocking)
        if (initialSession?.user) {
          fetchAdminProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Fetch admin profile on auth change (non-blocking)
          fetchAdminProfile(currentSession.user.id);
        } else {
          setAdmin(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { session: newSession, user: newUser, admin: adminData } = await supabaseAuthApi.login(email, password);
      setSession(newSession);
      setUser(newUser);
      setAdmin(adminData);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, full_name: string, phone?: string) => {
    try {
      const { session: newSession, user: newUser } = await supabaseAuthApi.register(email, password, full_name, phone);

      // If session is null, email confirmation is required
      if (!newSession && newUser) {
        // User created but needs email confirmation
        // Throw a special error to show the user a message
        throw new Error('CONFIRMATION_REQUIRED');
      }

      setSession(newSession);
      setUser(newUser);

      // Admin profile will be created by database trigger
      // Wait a moment then fetch it
      if (newUser && newSession) {
        setTimeout(() => {
          fetchAdminProfile(newUser.id);
        }, 500);

        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabaseAuthApi.logout();
      setUser(null);
      setAdmin(null);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = (userData: Partial<Admin>) => {
    if (admin) {
      const updatedAdmin = { ...admin, ...userData } as Admin;
      setAdmin(updatedAdmin);
    }
  };

  const value = {
    user,
    admin,
    session,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!session,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
