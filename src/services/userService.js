// src/services/userService.js
import { supabase } from '../supabaseConfig';

export const userService = {
  /**
   * Buscar perfil do usuário na tabela `users` do Supabase pelo email ou UID
   */
  async getUserProfile(emailOrUid) {
    if (!emailOrUid) return null;

    const query = emailOrUid.includes('@')
      ? supabase.from('users').select('*').eq('email', emailOrUid).maybeSingle()
      : supabase.from('users').select('*').eq('uid', emailOrUid).maybeSingle();

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar perfil do usuário no Supabase:', error);
      return null;
    }
    return data;
  },

  /**
   * Registrar ou garantir que o usuário existe na tabela `users` do Supabase
   */
  async upsertUser(user) {
    if (!user) return null;

    const email = user.email || '';
    const name = user.user_metadata?.full_name || user.name || email.split('@')[0];
    const photo_url = user.user_metadata?.avatar_url || user.photo_url || null;

    // Verificar se usuário já existe
    const existing = await this.getUserProfile(email);
    if (existing) {
      return existing;
    }

    // Criar novo usuário pendente de aprovação
    const newUser = {
      uid: user.id || `user_${Date.now()}`,
      name,
      email,
      role: null,
      status: 'pendente',
      approval_pending: true,
      photo_url,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar usuário no Supabase:', error);
      return newUser;
    }
    return data;
  },

  /**
   * Login com E-mail e Senha via Supabase Auth
   */
  async loginWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  /**
   * Registrar novo usuário com E-mail e Senha
   */
  async registerWithPassword(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });
    if (error) throw error;
    return data;
  },

  /**
   * Enviar e-mail de redefinição de senha
   */
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`
    });
    if (error) throw error;
    return data;
  },

  /**
   * Login com Google via Supabase OAuth
   */
  async loginWithGoogle() {
    const currentOrigin = window.location.origin.replace(/\/$/, '');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentOrigin
      }
    });
    if (error) throw error;
    return data;
  },

  /**
   * Logout via Supabase Auth
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Erro no logout do Supabase:', error);
    localStorage.removeItem('cronolab_user_session');
  }
};
