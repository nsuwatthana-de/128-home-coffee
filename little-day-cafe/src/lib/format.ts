const TZ = 'Asia/Bangkok';

export const baht = (n: number) =>
  `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

export const timeTH = (iso: string) =>
  new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

export const dateTH = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: TZ });

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
