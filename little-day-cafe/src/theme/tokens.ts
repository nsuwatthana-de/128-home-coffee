// สีแบบเดียวกับ @theme ใน styles/index.css ใช้ในกรณีที่ต้องการค่าสีใน TypeScript (เช่น แผนภูมิ)
export const colors = {
  ivory: '#F5F0E8',
  oat: '#C8B69F',
  matcha: '#6D8062',
  matchaDark: '#5A6B50',
  terracotta: '#A66F53',
  terracottaInk: '#8C5A40',
  coffee: '#463D35',
  white: '#FFFFFF',
} as const;

export const statusTone = {
  new: 'terracotta',
  accepted: 'oat',
  preparing: 'coffee',
  ready: 'matcha',
  completed: 'muted',
  cancelled: 'muted',
} as const;
