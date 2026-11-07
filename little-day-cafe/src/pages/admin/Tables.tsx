import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Badge, Button, Card, Dialog, EmptyState, Skeleton } from '../../ui';
import { repo } from '../../data';
import { useLive } from '../../hooks/useLive';
import { useAction } from '../../hooks/useAction';
import { QrImage } from '../../components/QrImage';
import type { TableRow } from '../../types';

const menuUrl = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}menu?t=${encodeURIComponent(token)}`;

export function Tables() {
  const { data, loading, error } = useLive(() => repo.listTables());
  const action = useAction();
  const [code, setCode] = useState('');
  const [issued, setIssued] = useState<{ code: string; token: string } | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!issued) { setDownloadUrl(null); return; }
    let alive = true;
    QRCode.toDataURL(menuUrl(issued.token), { margin: 2, width: 720, errorCorrectionLevel: 'M' })
      .then((u) => { if (alive) setDownloadUrl(u); }).catch(() => setDownloadUrl(null));
    return () => { alive = false; };
  }, [issued]);

  const add = () => action.run('add', async () => {
    await repo.createTable(code);
    setCode('');
    return 'เพิ่มโต๊ะแล้ว กด "สร้าง QR" เพื่อออก QR ให้โต๊ะนี้';
  });

  const rotate = (t: TableRow) => {
    const msg = t.hasToken
      ? `สร้าง QR ใหม่ให้โต๊ะ ${t.code}? QR เดิมจะใช้ไม่ได้ทันที`
      : `สร้าง QR ให้โต๊ะ ${t.code}?`;
    if (!confirm(msg)) return;
    action.run(`r-${t.id}`, async () => {
      const token = await repo.rotateTableToken(t.id);
      setIssued({ code: t.code, token });
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">โต๊ะและ QR Code</h1>
        <p className="text-sm text-coffee-mute">QR แต่ละโต๊ะมี token ที่ไม่ซ้ำ เมื่อสร้างใหม่ QR เดิมจะใช้ไม่ได้</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">รหัสโต๊ะใหม่</span>
          <input value={code} maxLength={10} placeholder="เช่น C01" onChange={(e) => setCode(e.target.value)}
            className="w-40 rounded-[12px] border border-oat bg-white px-3 py-2.5 uppercase" /></label>
        <Button disabled={!code.trim() || !!action.busy} onClick={add}>+ เพิ่มโต๊ะ</Button>
      </Card>

      {action.error && <p role="alert" className="text-sm text-terracotta-ink">{action.error}</p>}
      {action.notice && <p role="status" className="text-sm text-matcha-dark">{action.notice}</p>}
      {loading && <Skeleton className="h-60 w-full" />}
      {error && <EmptyState title="โหลดโต๊ะไม่สำเร็จ" description={error} />}

      {data && (data.length === 0 ? <EmptyState title="ยังไม่มีโต๊ะ" description="เพิ่มโต๊ะแรกด้านบน" /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {data.map((t) => (
            <Card key={t.id} className="flex flex-col items-center gap-3 text-center">
              <p className="text-lg font-semibold">โต๊ะ {t.code}</p>
              {!t.active ? <Badge tone="muted">ปิดใช้งาน</Badge> : t.hasToken ? <Badge tone="matcha">พร้อมใช้งาน</Badge> : <Badge tone="terracotta">ยังไม่มี QR</Badge>}
              <div className="flex w-full flex-col gap-2">
                <Button variant="secondary" size="sm" disabled={!!action.busy} onClick={() => rotate(t)}>
                  {t.hasToken ? 'สร้าง QR ใหม่' : 'สร้าง QR'}
                </Button>
                <Button variant="ghost" size="sm" disabled={!!action.busy} onClick={() => action.run(`t-${t.id}`, async () => { await repo.setTableActive(t.id, !t.active); })}>
                  {t.active ? 'ปิดโต๊ะ' : 'เปิดโต๊ะ'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ))}

      <Dialog open={!!issued} onClose={() => setIssued(null)} title={issued ? `QR โต๊ะ ${issued.code}` : ''} sheet>
        {issued && (
          <div className="print-area flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-coffee-mute">LITTLE DAY CAFE · โต๊ะ {issued.code}</p>
            <QrImage text={menuUrl(issued.token)} size={260} />
            <p className="text-xs text-coffee-mute">แสดง QR นี้ให้ลูกค้าสแกนเพื่อสั่งที่โต๊ะ ค่านี้จะแสดงเพียงครั้งเดียว</p>
            <p data-testid="menu-url" className="break-all rounded-[10px] bg-ivory-deep px-3 py-2 font-mono text-[11px] text-coffee-mute">{menuUrl(issued.token)}</p>
            <div className="no-print flex w-full flex-wrap gap-2">
              {downloadUrl && <a href={downloadUrl} download={`qr-${issued.code}.png`} className="flex-1 rounded-[12px] bg-matcha-dark px-4 py-2.5 text-center text-sm font-medium text-white">ดาวน์โหลด PNG</a>}
              <Button variant="secondary" className="flex-1" onClick={() => window.print()}>พิมพ์</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
