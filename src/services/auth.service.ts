import { supabase } from '@/config/supabase';
import type { Profile } from '@/types';

export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign up (Register)
   */
  async signUp(email: string, password: string, fullName: string, role = 'member') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    if (error) throw error;

    // Link user to default group if exists
    if (data.user) {
      const defaultGroupId = '00000000-0000-0000-0000-000000000001';
      await supabase
        .from('profiles')
        .update({ group_id: defaultGroupId, role: role as any } as any)
        .eq('id', data.user.id);
    }

    return data;
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get current user
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  /**
   * Reset password (send reset email)
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  /**
   * Get user profile from profiles table
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Profile;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  /**
   * Admin: invite user
   */
  async inviteUser(email: string, role: string, groupId: string) {
    const { data, error } = await supabase.from('profiles').insert({
      id: crypto.randomUUID(),
      email,
      full_name: null,
      role: role as any,
      status: 'inactive',
      group_id: groupId,
    } as any);
    if (error) throw error;
    return data;
  },

  /**
   * Update profile avatar
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(path, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('public').getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
