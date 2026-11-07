// ชื่อผู้พัฒนาแสดงท้ายหน้า
export function DeveloperCredit({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-coffee-mute ${className}`}>
      พัฒนาโดย Natthikorn Suwatthana
    </p>
  );
}
