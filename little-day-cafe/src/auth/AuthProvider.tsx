import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isRemote, supabase } from '../data';
import { EmptyState, Skeleton } from '../ui';
import type { Role } from '../types';

export interface Session {
  role: Role;
  email?: string;
}

interface AuthApi {
  session: Session | null;
  loading: boolean;
  signInDemo: (role: Role) => void; // โหมดทดลองเท่านั้น ไม่มีการตรวจรหัสผ่าน
  signInPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthApi | null>(null);
const DEMO_KEY = 'ldc-demo-role';

const readDemo = (): Session | null => {
  try {
    const r = sessionStorage.getItem(DEMO_KEY) as Role | null;
    return r ? { role: r } : null;
  } catch { return null; }
};

async function roleFor(userId: string): Promise<Role | null> {
  const { data, error } = await supabase!.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.role as Role | undefined) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => (isRemote ? null : readDemo()));
  const [loading, setLoading] = useState(isRemote);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const apply = async (email: string | undefined, userId: string | undefined) => {
      if (!userId) { if (alive) setSession(null); return; }
      const role = await roleFor(userId).catch(() => null);
      if (alive) setSession(role ? { role, email } : null);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.email, data.session?.user.id))
      .finally(() => { if (alive) setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void apply(s?.user.email, s?.user.id); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const api: AuthApi = {
    session,
    loading,
    signInDemo(role) {
      try { sessionStorage.setItem(DEMO_KEY, role); } catch { /* ignore */ }
      setSession({ role });
    },
    async signInPassword(email, password) {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    },
    async signOut() {
      try { sessionStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
      if (supabase) await supabase.auth.signOut();
      setSession(null);
    },
  };

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider');
  return ctx;
}

// ป้องกันหน้าหลังร้าน ตรวจทั้งบทบาทฝั่งหน้าจอ และ RLS/function ฝั่งฐานข้อมูลเป็นตัวบังคับจริง
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(session.role)) {
    return <EmptyState title="ไม่มีสิทธิ์เข้าหน้านี้" description="บัญชีของคุณไม่ได้รับสิทธิ์ให้ใช้หน้านี้" />;
  }
  return <>{children}</>;
}
