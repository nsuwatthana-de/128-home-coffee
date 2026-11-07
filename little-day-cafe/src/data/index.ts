import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createLocalRepo } from './localRepo';
import { createSupabaseRepo } from './supabaseRepo';
import type { Repo } from './repo';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// ตั้งค่า Supabase แล้วใช้โหมดจริง ไม่งั้นใช้โหมดทดลองในเบราว์เซอร์
export const isRemote = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = isRemote ? createClient(url!, anonKey!) : null;

const storage = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ไม่มีพื้นที่ */ } },
};

export const repo: Repo = supabase
  ? createSupabaseRepo(supabase)
  : createLocalRepo(storage, typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('little-day-cafe') : undefined);
