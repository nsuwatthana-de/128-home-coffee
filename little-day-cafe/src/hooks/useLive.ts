import { useCallback, useEffect, useRef, useState } from 'react';
import { repo } from '../data';

// โหลดข้อมูลจาก repo และโหลดใหม่อัตโนมัติเมื่อมีการเปลี่ยนแปลง (realtime หรือ storage)
export function useLive<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const run = useCallback(async () => {
    const my = ++seq.current;
    try {
      const d = await load();
      if (my === seq.current) { setData(d); setError(null); }
    } catch (e) {
      if (my === seq.current) setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด');
    } finally {
      if (my === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
    let timer: number | undefined;
    const unsub = repo.subscribe(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), 150);
    });
    return () => { unsub(); window.clearTimeout(timer); };
  }, [run]);

  return { data, error, loading, reload: run };
}
