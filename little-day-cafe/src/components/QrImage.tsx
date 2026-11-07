import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// สร้างภาพ QR ในเบราว์เซอร์ ไม่ส่งข้อมูลโต๊ะไปบริการภายนอก
export function QrImage({ text, size = 240 }: { text: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { margin: 1, width: size, errorCorrectionLevel: 'M' })
      .then((url) => { if (alive) setSrc(url); })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [text, size]);
  if (error) return <p className="text-sm text-terracotta-ink">สร้าง QR ไม่สำเร็จ: {error}</p>;
  if (!src) return <div className="size-60 animate-pulse rounded-[12px] bg-oat-soft" />;
  return <img src={src} alt="QR Code" width={size} height={size} className="rounded-[12px] bg-white p-2" />;
}
