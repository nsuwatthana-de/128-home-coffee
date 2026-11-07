import { Button, Card, Input } from '../../ui';

export function Settings() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่าร้าน</h1>
        <p className="text-sm text-coffee-mute">การบันทึกจริงจะเปิดใช้ในเฟส 3</p>
      </div>
      <Card className="grid gap-4 md:grid-cols-2">
        <Input label="ชื่อร้าน" defaultValue="LITTLE DAY CAFE" />
        <Input label="เบอร์โทร" defaultValue="" />
        <Input label="ที่อยู่" defaultValue="" className="md:col-span-2" />
        <Input label="PromptPay ID" defaultValue="" />
        <Input label="เวลาเปิด-ปิด" defaultValue="08:00 – 18:00" />
        <div className="md:col-span-2 flex justify-end">
          <Button disabled title="จะเปิดใช้ในเฟส 3">บันทึก</Button>
        </div>
      </Card>
    </div>
  );
}
