# LITTLE DAY CAFE — Phase 0: Architecture & Design Plan

สถานะ: เอกสารออกแบบก่อนเขียนระบบจริง (ตามสเปก "ก่อนเริ่มเขียนโค้ด ให้แสดง...")

## 1. ภาพรวมระบบ

ระบบเดียว ฐานข้อมูลเดียว แยก 3 ส่วนหน้าจอ

| ส่วน | ผู้ใช้ | Route | อุปกรณ์หลัก |
|---|---|---|---|
| Customer | ลูกค้า (ไม่ต้องสมัคร) | `/menu`, `/product/:id`, `/cart`, `/checkout`, `/order/:id` | มือถือ |
| Admin | เจ้าของ / พนักงานที่มีสิทธิ์ | `/admin/*` | Desktop / แท็บเล็ต |
| Kitchen | พนักงานครัว/บาร์ | `/kitchen` | แท็บเล็ต |

Phase 1 ใช้ mock data เฉพาะชั้น UI เท่านั้น ข้อมูลจริงจะผูกกับ Supabase ใน Phase 3

## 2. สถาปัตยกรรม

```
┌────────────────────────── Browser (PWA) ──────────────────────────┐
│  React 19 + TypeScript + Vite                                      │
│  ├─ routes/customer   ├─ routes/admin   ├─ routes/kitchen          │
│  ├─ features/*  (cart, orders, products, tables, payments, ...)    │
│  ├─ ui/*        (design system: Button, Card, Badge, Tabs, ...)    │
│  └─ lib/*       (supabase client, format, validation)              │
└──────────────┬─────────────────────────────────────────────────────┘
               │ anon key เท่านั้น (ห้ามใส่ service role key ใน frontend)
┌──────────────▼─────────────────────────────────────────────────────┐
│ Supabase                                                            │
│  ├─ PostgreSQL + RLS      (ตารางทั้งหมด, สิทธิ์ต่อบทบาท)            │
│  ├─ Database Functions    (create_order, verify_table_token, ...)   │
│  │    └─ คำนวณราคา/ยอดรวม/ตัดสต็อกที่ฝั่ง server ใน transaction      │
│  ├─ Auth                  (เฉพาะพนักงาน ลูกค้าใช้ session token)    │
│  ├─ Realtime              (orders, order_items → Kitchen/Admin)     │
│  └─ Storage               (รูปสินค้า, bucket แบบ public-read)        │
└─────────────────────────────────────────────────────────────────────┘
```

หลักการสำคัญ
- ราคาและยอดรวมคำนวณใน database function ไม่เชื่อค่าจาก client
- การยืนยันโต๊ะใช้ `table_tokens` (token สุ่มที่ผูกกับโต๊ะ) ไม่ใช้เลขโต๊ะจาก URL
- การชำระ PromptPay ไม่เปลี่ยนเป็น "ชำระแล้ว" จนกว่าพนักงานยืนยัน
- สิทธิ์ทุกอย่างตรวจที่ RLS / function ไม่ใช่แค่ซ่อนปุ่มใน frontend

## 3. ER Diagram (Phase 3 จะสร้างจริง)

```
profiles (id = auth.users.id, role: owner|staff|kitchen)
   │
categories (id, name, slug, station: beverage|bakery, sort, active)
   │ 1
   │ *
products (id, category_id, name, description, base_price, image_path,
          is_available, is_featured, sort, created_at, updated_at)
   │1                 │1
   │*                 │*
product_options       recipes (id, product_id) ──1──* recipe_items (recipe_id, ingredient_id, qty, unit)
(id, product_id,         │
 name, type:           inventory (ingredient_id ...)
 single|multi,           │1
 required)               │*
   │1                  inventory_transactions (id, ingredient_id, qty_change,
   │*                    reason: purchase|order|adjust|waste, order_item_id, ...)
product_option_values
(id, option_id, name,
 price_delta, sort)

tables (id, code 'A01', name, is_active, sort)
   │1
   │*
table_tokens (id, table_id, token_hash, expires_at, revoked_at)

orders (id, order_no (running int/day), channel: dine_in|takeaway|counter,
        table_id NULL, queue_no NULL, customer_name, note,
        status: new|accepted|preparing|ready|completed|cancelled,
        payment_method: cash|promptpay, payment_status: unpaid|pending|paid|refunded,
        subtotal, discount_total, total, created_at, updated_at)
   │1
   │*
order_items (id, order_id, product_id, product_name_snapshot, unit_price_snapshot,
             qty, station, line_total, note)
   │1
   │*
order_item_options (id, order_item_id, option_name_snapshot, value_name_snapshot,
                    price_delta_snapshot)

payments (id, order_id, method, amount, status: pending|confirmed|rejected,
          reference, confirmed_by → profiles, confirmed_at, created_at)

promotions (id, name, type: percent|amount|bundle, value, starts_at, ends_at, active)
```

หมายเหตุการออกแบบ
- ใช้ "snapshot" ของชื่อและราคาในรายการออเดอร์ เพื่อให้ยอดย้อนหลังไม่เปลี่ยนเมื่อแก้เมนู
- `payments` แยกจาก `orders` เพื่อรองรับการชำระซ้ำหรือยืนยันผิด และป้องกันการบันทึกยอดซ้ำด้วย unique key ต่อ reference
- `inventory`, `recipes`, `promotions` ถูกสร้างตาราง ตั้งแต่ V1 แต่ฟีเจอร์ใช้งานจริงอยู่ใน V2

## 4. โครงโฟลเดอร์ (ฝั่ง frontend)

```
little-day-cafe/
├─ docs/ARCHITECTURE.md
├─ index.html
├─ vite.config.ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                    # routes ทั้งหมด
│  ├─ styles/index.css           # Tailwind + design tokens
│  ├─ theme/tokens.ts            # สี ระยะ รัศมี เงา ใช้ร่วมกับ TS
│  ├─ ui/                        # Design System (ไม่มี logic ธุรกิจ)
│  │  ├─ Button.tsx  Card.tsx  Badge.tsx  Tabs.tsx  Input.tsx
│  │  ├─ Stat.tsx    EmptyState.tsx  Skeleton.tsx  Dialog.tsx  Toast.tsx
│  │  └─ index.ts
│  ├─ layouts/
│  │  ├─ CustomerLayout.tsx      # top bar + bottom nav + cart shortcut
│  │  ├─ AdminLayout.tsx         # sidebar (desktop) / top tabs (tablet)
│  │  └─ KitchenLayout.tsx       # full screen, เสียงเปิด/ปิด
│  ├─ pages/
│  │  ├─ customer/   Home.tsx  Menu.tsx  ProductDetail.tsx  Cart.tsx  Checkout.tsx  OrderStatus.tsx
│  │  ├─ admin/      Dashboard.tsx  Orders.tsx  Products.tsx  Tables.tsx  Inventory.tsx  Reports.tsx  Settings.tsx
│  │  └─ kitchen/    Board.tsx
│  ├─ features/                  # (Phase 2+) logic ต่อโดเมน: cart/, orders/, products/, ...
│  ├─ lib/                       # supabase client, format (฿, วันเวลา Asia/Bangkok)
│  ├─ mock/                      # mock data ใช้ใน Phase 1 เท่านั้น
│  └─ types/                     # ชนิดข้อมูลที่ตรงกับ ER
├─ supabase/
│  ├─ migrations/                # (Phase 3)
│  └─ tests/                     # (Phase 8) ทดสอบ RLS และ function
└─ .env.example
```

## 5. User Journey

**ลูกค้า (ที่โต๊ะ)**
1. สแกน QR โต๊ะ → เปิด `/menu?t=<token>` ระบบแปลง token เป็นโต๊ะ (Phase 4)
2. เลือกหมวด → แตะสินค้า → เลือกขนาด/หวาน/น้ำแข็ง/นม/ท็อปปิ้ง/จำนวน
3. เพิ่มลงตะกร้า → `/cart` ตรวจรายการและยอด
4. `/checkout` เลือกทานที่ร้านหรือกลับบ้าน ชื่อ (ไม่บังคับ) หมายเหตุ และวิธีชำระ
5. ยืนยัน → `/order/:id` ติดตามสถานะ (รับแล้ว → กำลังทำ → พร้อมเสิร์ฟ → เสร็จ)

**ลูกค้า (กลับบ้าน)**
- เลือก Takeaway ที่ Home หรือ `/menu` แล้วได้หมายเลขคิว ไม่ต้องสแกนโต๊ะ

**พนักงานเคาน์เตอร์**
- เปิดออเดอร์แทนลูกค้าที่ Admin/POS → รับเงินสด หรือยืนยัน PromptPay หลังตรวจยอดจริง

**ครัว**
- เห็นออเดอร์ใหม่ที่ `/kitchen` (เสียงแจ้งเตือน) → กดรับ → กำลังทำ → พร้อมเสิร์ฟ แยกเครื่องดื่มและเบเกอรี่

**เจ้าของร้าน**
- `/admin` ดูยอดวันนี้ → จัดการสินค้า โต๊ะ/QR วัตถุดิบ โปรโมชัน รายงาน ตั้งค่าร้าน

## 6. Design System (Phase 1)

| หมวด | ค่า |
|---|---|
| สี | Warm Ivory `#F5F0E8` (พื้น), Oat Beige `#C8B69F` (เส้น/รอง), Matcha `#6D8062` (ปุ่มหลัก), Terracotta `#A66F53` (เน้น/เตือน), Coffee `#463D35` (ตัวอักษร), White `#FFFFFF` (การ์ด) |
| ฟอนต์ | IBM Plex Sans Thai (ไทย), DM Sans (อังกฤษ/ตัวเลข) |
| มุม | Card 16px, ปุ่ม 12px, Badge เต็ม |
| เงา | นุ่ม ใช้น้อย (`0 1px 2px` และ `0 8px 24px` ต่ำ opacity) |
| เส้น | ใช้เส้นบาง (Oat Beige) แทนการตีกรอบทุกส่วน |
| Motion | 150–200ms ease-out, เคารพ `prefers-reduced-motion` |
| Contrast | ตัวอักษรต้องถึง WCAG AA (อย่างน้อย 4.5:1). Coffee บน Ivory ≈ 9.3:1. ปุ่มหลักใช้ Matcha Dark `#5A6B50` (ตัวอักษรขาว ≈ 5.7:1) ส่วน Matcha `#6D8062` ใช้กับพื้นและตัวเน้นที่ไม่ใช่ตัวอักษร. Terracotta ใช้เป็นข้อความต้องใช้เฉด `#8C5A40` (≈ 5.7:1 บนขาว) |
| สถานะออเดอร์ | NEW = Terracotta, PREPARING = Oat/Coffee, READY = Matcha, COMPLETED = เทาอ่อน, CANCELLED = เทา + ขีดฆ่า |

Component ที่ต้องมีใน Phase 1: Button, Card, Badge, Tabs, Input, Stat, EmptyState, Skeleton, Dialog, Toast, ProductCard, OptionPicker, OrderCard, StatusColumn

## 7. Wireframe (ระดับโครง)

**Customer — Menu (มือถือ)**
```
┌──────────────────────────┐
│ LITTLE DAY        โต๊ะ A01│
│ Good morning! ...        │
│ [เครื่องดื่ม][ขนม][ขนมปัง]│  ← Tabs เลื่อนแนวนอน
│ ┌────────┐ ┌────────┐    │
│ │ [รูป]  │ │ [รูป]  │    │  ← ProductCard 2 คอลัมน์
│ │ ชื่อ   │ │ ชื่อ   │    │
│ │ ฿85  + │ │ ฿95  + │    │
│ └────────┘ └────────┘    │
│ ──────────────────────── │
│ [หน้าหลัก][เมนู][ตะกร้า][ออเดอร์] │ ← BottomNav
└──────────────────────────┘
```

**Customer — Product Detail (bottom sheet)**
```
│ [รูปใหญ่]                │
│ ชื่อ / คำอธิบาย / ฿ราคา   │
│ ขนาด      [S][M][L]      │
│ หวาน      [0][25][50]... │
│ น้ำแข็ง   [ไม่ใส่][น้อย].. │
│ นม        [นมสด][โอ๊ต].. │
│ เพิ่มช็อต  [+ ฿20]        │
│ หมายเหตุ  [___________]  │
│ [−] 1 [+]   [เพิ่มลงตะกร้า ฿85] │
```

**Customer — Checkout**
```
│ ทานที่ร้าน | กลับบ้าน      │
│ ชื่อ (ไม่บังคับ) [______] │
│ หมายเหตุ       [______]   │
│ ชำระ: (•) เงินสด  ( ) PromptPay │
│ ยอดรวม ฿265               │
│ [ยืนยันออเดอร์]            │
```

**Customer — Order Status**
```
│ ออเดอร์ #A012              │
│ ●─●─○─○  รับแล้ว→กำลังทำ→... │
│ ประมาณ 8 นาที              │
│ รายการ / การชำระเงิน        │
```

**Admin — Dashboard (Desktop/แท็บเล็ต)**
```
┌ Sidebar ┬──────────────────────────────────────┐
│ Overview│ [ยอดวันนี้][ออเดอร์][รอดำเนินการ][เฉลี่ย] │
│ Orders  │ [กราฟยอดขาย 7 วัน]   [สินค้าขายดี]    │
│ Products│ ออเดอร์ล่าสุด (ตาราง)                  │
│ Tables&QR│                                       │
│ Inventory│                                       │
│ Promotions│                                      │
│ Reports │                                        │
│ Settings│                                        │
└─────────┴────────────────────────────────────────┘
```

**Admin — Orders**: ตัวกรองวันที่/สถานะ/ช่องทาง + ค้นหา, ตารางออเดอร์, แถบรายละเอียดด้านขวา

**Admin — Products**: ตารางสินค้า (รูป, ชื่อ, หมวด, ราคา, เปิดขาย, แนะนำ) + ปุ่มเพิ่ม/แก้ไข/ลบ

**Admin — Tables & QR**: การ์ดต่อโต๊ะ (รหัส, สถานะ, QR), ปุ่มดาวน์โหลด/พิมพ์, เปิด/ปิดโต๊ะ

**Kitchen (แท็บเล็ต เต็มจอ)**
```
│ NEW (2)     │ PREPARING (3) │ READY (1)   │ COMPLETED   │
│ ┌─────────┐ │ ┌───────────┐ │ ┌─────────┐ │             │
│ │#A013 A01│ │ │#A012 A01  │ │ │#A011 B02│ │             │
│ │Latte ×2 │ │ │Matcha ×1  │ │ │...      │ │             │
│ │[รับ]    │ │ │[พร้อม]    │ │ │[เสร็จ]  │ │             │
│ └─────────┘ │ └───────────┘ │ └─────────┘ │             │
│ [เครื่องดื่ม] [เบเกอรี่] (กรอง station)   🔔 เสียง on/off │
```

## 8. Development Checklist

Phase 0: เอกสารนี้ — เสร็จ
Phase 1 — UI Foundation: เสร็จ (Design System, layouts, responsive)
Phase 2 — Customer QR Ordering: เสร็จ ตะกร้าคงอยู่ในเบราว์เซอร์ ตรวจตัวเลือกและราคาที่ฝั่งเซิร์ฟเวอร์ (`create_order`)
Phase 3 — Database & Backend: เสร็จ (schema, RLS, function, Auth ด้วยบทบาท `profiles`) ทดสอบ SQL ด้วย PostgreSQL จริง (PGlite)
Phase 4 — QR Ordering: เสร็จ token ต่อโต๊ะ เก็บเป็น hash หมุนใหม่ได้ QR เดิมใช้ไม่ได้ทันที
Phase 5 — Admin & POS: เสร็จ (ภาพรวม ออเดอร์ ขายหน้าร้าน สินค้า รับเงินสด และยืนยัน PromptPay ด้วยพนักงาน)
Phase 6 — Kitchen Display: เสร็จ (realtime, กรองสถานี, เสียงแจ้งเตือน)
Phase 7 — Inventory & Reports: เสร็จ (สต็อก สูตร ตัดสต็อกและคืนเมื่อยกเลิก รายงาน รายจ่าย ส่งออก CSV)
Phase 8 — Testing & Deployment: ทดสอบเสร็จ (unit 22 รายการ, DB 1 ชุด, E2E ในเบราว์เซอร์) การ deploy จริงรอ credential ของ Vercel และ Supabase

หมายเหตุ: V2 (โปรโมชัน, สมาชิกและแต้ม, วิเคราะห์เชิงลึก) ยังไม่ได้ทำตามแผน

## 9. ประเด็นที่ยังต้องยืนยันกับเจ้าของร้าน

- ชื่อร้านและโลโก้จริง (ตอนนี้ใช้ LITTLE DAY CAFE เป็นชื่อต้นแบบ)
- ข้อมูล PromptPay ID และบัญชีรับเงิน
- เวลาเปิด-ปิดและภาษี (VAT) ถ้ามี
- รูปสินค้าจริง (ตอนนี้จะใช้ placeholder)
