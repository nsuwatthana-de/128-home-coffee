import { useRef, useState } from 'react';

// รันการกระทำที่แก้ข้อมูล: กันการกดซ้ำระหว่างรอ และเก็บข้อความผิดพลาดไว้แสดง
export function useAction() {
  const inFlight = useRef<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void | string>) => {
    if (inFlight.current) return;
    inFlight.current = key;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const msg = await fn();
      if (typeof msg === 'string') setNotice(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด');
    } finally {
      inFlight.current = null;
      setBusy(null);
    }
  };

  return { busy, error, notice, run, setError, setNotice };
}
