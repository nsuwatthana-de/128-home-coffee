import { Link } from 'react-router-dom';
import { EmptyState } from '../ui';

export function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState title="ไม่พบหน้านี้" description="ลิงก์อาจไม่ถูกต้องหรือถูกย้ายไปแล้ว" action={<Link to="/" className="text-sm font-medium text-matcha-dark">กลับหน้าหลัก</Link>} />
    </div>
  );
}
