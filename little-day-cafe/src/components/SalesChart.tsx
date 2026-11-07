import { baht } from '../lib/format';

const BAR_AREA_PX = 144; // ความสูงพื้นที่แท่งกราฟ (พิกเซล) ใช้พิกเซลเพื่อให้ความสูงแท่งแสดงผลถูกต้อง

// กราฟแท่งแบบง่ายด้วย CSS ไม่ต้องใช้ไลบรารีใน Phase 1
export function SalesChart({ data }: { data: { day: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div role="img" aria-label="ยอดขาย 7 วันที่ผ่านมา" className="flex items-end gap-3">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[11px] text-coffee-mute">{baht(d.value)}</span>
          <div className="flex w-full items-end" style={{ height: BAR_AREA_PX }}>
            <div
              className="w-full rounded-t-[10px] bg-matcha transition-[height] duration-300"
              style={{ height: Math.round((d.value / max) * BAR_AREA_PX) }}
            />
          </div>
          <span className="text-xs text-coffee-mute">{d.day}</span>
        </div>
      ))}
    </div>
  );
}
