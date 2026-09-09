// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseConfig';
import { userService } from './services/userService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sessão ativa no Supabase Auth
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          const profile = await userService.upsertUser(session.user);
          setUserProfile(profile);
        } else {
          // Verificar fallback de sessão salva localmente
          const localSession = localStorage.getItem('cronolab_user_session');
          if (localSession) {
            const parsed = JSON.parse(localSession);
            setCurrentUser(parsed);
            const profile = await userService.getUserProfile(parsed.email);
            setUserProfile(profile || parsed);
          }
        }
      } catch (err) {
        console.error('Erro ao inicializar sessão de auth:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 2. Escutar mudanças de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        const profile = await userService.upsertUser(session.user);
        setUserProfile(profile);
      } else {
        const localSession = localStorage.getItem('cronolab_user_session');
        if (!localSession) {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loginWithSupabase = async (email, name, role = 'coordenador') => {
    const profile = await userService.getUserProfile(email);
    const userObj = profile || {
      uid: `usr_${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      role,
      status: 'aprovado',
      approval_pending: false
    };
    localStorage.setItem('cronolab_user_session', JSON.stringify(userObj));
    setCurrentUser(userObj);
    setUserProfile(userObj);
  };

  const logout = async () => {
    await userService.logout();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithSupabase,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}