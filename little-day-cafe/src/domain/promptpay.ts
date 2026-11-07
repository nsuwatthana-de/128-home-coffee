// สร้างข้อความ EMV QR สำหรับ PromptPay (ตาม EMVCo Merchant-Presented QR และมาตรฐาน BOT)

const CRC_POLY = 0x1021;

// CRC-16/CCITT-FALSE (init 0xFFFF) ตามที่ PromptPay ใช้
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ CRC_POLY) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const tlv = (id: string, value: string) => `${id}${value.length.toString().padStart(2, '0')}${value}`;

// แปลงหมายเลขโทรศัพท์ / เลขผู้เสียภาษี 13 หลัก เป็นรูปแบบที่ PromptPay ใช้
export function normalizeTarget(raw: string): { subTag: '01' | '02'; value: string } {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 13) return { subTag: '02', value: digits };
  if (/^0\d{9}$/.test(digits)) return { subTag: '01', value: `0066${digits.slice(1)}` };
  if (/^66\d{9}$/.test(digits)) return { subTag: '01', value: `00${digits}` };
  throw new Error('หมายเลข PromptPay ไม่ถูกต้อง (ต้องเป็นเบอร์มือถือ 10 หลักหรือเลขผู้เสียภาษี 13 หลัก)');
}

export interface PromptPayInput {
  target: string;
  amount: number;
  merchantName?: string;
  reference?: string;
}

export function buildPromptPayPayload({ target, amount, merchantName = 'LITTLE DAY CAFE', reference }: PromptPayInput): string {
  if (!(amount > 0)) throw new Error('ยอดชำระต้องมากกว่า 0');
  const { subTag, value } = normalizeTarget(target);
  const parts = [
    tlv('00', '01'),
    tlv('01', '12'), // QR แบบมียอดเงิน (ใช้ครั้งเดียวต่อออเดอร์)
    tlv('29', tlv('00', 'A000000677010111') + tlv(subTag, value)),
    tlv('53', '764'),
    tlv('54', amount.toFixed(2)),
    tlv('58', 'TH'),
    tlv('59', merchantName.slice(0, 25)),
    tlv('60', 'BANGKOK'),
  ];
  if (reference) parts.push(tlv('62', tlv('05', reference.slice(0, 25))));
  const body = parts.join('') + '6304';
  return body + crc16(body);
}
