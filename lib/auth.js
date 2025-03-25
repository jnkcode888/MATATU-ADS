// lib/auth.js
import { supabase } from './supabase';

export const auth = supabase.auth;

export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing in:', error.message);
    return null;
  }
}

export async function signOut() {
  try {
    const { error } = await auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error signing out:', error.message);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error fetching current user:', error.message);
    return null;
  }
}

export const db = supabase;