import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('@cronolab_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        await fetchProfile(parsed.email || parsed.id);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.email);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (emailOrUid) => {
    if (!emailOrUid) return;
    try {
      const isEmail = emailOrUid.includes('@');
      const query = isEmail
        ? supabase.from('users').select('*').eq('email', emailOrUid).maybeSingle()
        : supabase.from('users').select('*').eq('uid', emailOrUid).maybeSingle();

      const { data } = await query;
      if (data) {
        setUserProfile(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem('@cronolab_user', JSON.stringify(data.user));
        await fetchProfile(data.user.email);
      }
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = async () => {
    const guestUser = {
      id: 'guest_user',
      email: 'visitante@cesmac.br',
      role: 'visualizador',
      name: 'Visitante CronoLab'
    };
    setUser(guestUser);
    setUserProfile(guestUser);
    await AsyncStorage.setItem('@cronolab_user', JSON.stringify(guestUser));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('@cronolab_user');
    setUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
