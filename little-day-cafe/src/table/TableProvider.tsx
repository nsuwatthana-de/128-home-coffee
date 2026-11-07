import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo } from '../data';

// โต๊ะจาก QR: ยืนยันด้วย token ที่ฐานข้อมูลตรวจเท่านั้น เลขโต๊ะใน URL ไม่มีผลต่อการสั่ง
export type TableStatus = 'none' | 'checking' | 'ok' | 'invalid';

interface TableApi {
  token: string | null;
  code: string | null;
  status: TableStatus;
}

const Ctx = createContext<TableApi>({ token: null, code: null, status: 'none' });
const KEY = 'ldc-table-token';

export function TableProvider({ children, incoming }: { children: ReactNode; incoming: string | null }) {
  const [token, setToken] = useState<string | null>(() => {
    if (incoming) return incoming;
    try { return sessionStorage.getItem(KEY); } catch { return null; }
  });
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<TableStatus>(token ? 'checking' : 'none');

  // สแกน QR ใหม่ระหว่างใช้งาน ให้ใช้ token ใหม่ทันที
  useEffect(() => {
    if (incoming && incoming !== token) setToken(incoming);
  }, [incoming, token]);

  useEffect(() => {
    if (!token) { setStatus('none'); setCode(null); return; }
    try { sessionStorage.setItem(KEY, token); } catch { /* ignore */ }
    let alive = true;
    setStatus('checking');
    repo.resolveToken(token)
      .then((r) => { if (!alive) return; setCode(r?.code ?? null); setStatus(r ? 'ok' : 'invalid'); })
      .catch(() => { if (alive) setStatus('invalid'); });
    return () => { alive = false; };
  }, [token]);

  return <Ctx.Provider value={{ token, code, status }}>{children}</Ctx.Provider>;
}

export const useTable = () => useContext(Ctx);
