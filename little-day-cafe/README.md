# LITTLE DAY CAFE

ระบบบริหารร้านคาเฟ่ขนาดเล็ก: สั่งผ่าน QR ที่โต๊ะ, หลังร้าน, จอครัว

สถานะตอนนี้: **Phase 1 — UI Foundation** (ข้อมูลเป็น mock ยังไม่เชื่อมฐานข้อมูล)
แผนและสถาปัตยกรรมอยู่ที่ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## เริ่มใช้งาน

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build production
npm run preview    # ดู build
```

## เส้นทาง

| ส่วน | เส้นทาง |
|---|---|
| ลูกค้า | `/`, `/menu`, `/product/:id`, `/cart`, `/checkout`, `/order/:id` |
| หลังร้าน | `/admin`, `/admin/orders`, `/admin/products`, `/admin/tables`, `/admin/inventory`, `/admin/promotions`, `/admin/reports`, `/admin/settings` |
| ครัว | `/kitchen` |

## ตัวแปรสภาพแวดล้อม (Phase 3 เป็นต้นไป)

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
ห้ามใส่ service role key ในฝั่ง frontend เด็ดขาด
