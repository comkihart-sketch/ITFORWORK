# คู่มือการติดตั้งและ Deploy ShiftFlow ขึ้น Vercel + Supabase 🚀

คู่มือนี้จะพาคุณนำระบบ **ShiftFlow (ระบบจัดตารางเวรและสลับกะแผนก)** ขึ้นสู่ Cloud ใช้งานจริงได้ฟรี 100% 

---

## 🏗 โครงสร้างสถาปัตยกรรม (Architecture)

```
[ผู้ใช้งานเข้าเว็บ] ──▶ https://your-app.vercel.app (Vercel CDN + React Frontend)
                              │
                              ▼ (เรียก API ภายในโดเมนเดียวกัน)
                    Vercel Serverless Function (/api)
                              │
                              ▼ (HTTPS / Supabase Client)
                    Supabase Cloud PostgreSQL (Singapore)
```

---

## ขั้นตอนที่ 1: ติดตั้งฐานข้อมูลบน Supabase (ใช้เวลา 2-3 นาที)

1. เข้าเว็บไซต์ [https://supabase.com/](https://supabase.com/) และล็อกอิน (หรือ Sign up ด้วยบัญชี GitHub/Email)
2. กดปุ่ม **"New Project"**
   - **Name**: ตั้งชื่อ เช่น `shiftflow-db`
   - **Database Password**: ตั้งรหัสผ่านที่ปลอดภัย (จำหรือจดบันทึกไว้)
   - **Region**: เลือก **Singapore (ap-southeast-1)** (เซิร์ฟเวอร์อยู่ใกล้ประเทศไทย ความเร็วสูงที่สุด)
   - **Pricing Plan**: Free Plan
   - กด **"Create new project"** (รอประมาณ 1-2 นาทีเพื่อให้ระบบเตรียมฐานข้อมูล)
3. เมื่อเข้าสู่หน้าแดชบอร์ดของโปรเจกต์แล้ว ให้คลิกเมนู **"SQL Editor"** แถบด้านซ้าย (ไอคอนรูป `>_`)
4. กดปุ่ม **"New query"** (หรือไอคอน `+`)
5. เปิดไฟล์ [supabase-schema.sql](./supabase-schema.sql) ในโฟลเดอร์โปรเจกต์ของคุณ
   - คัดลอก (Copy) โค้ด SQL ทั้งหมดในไฟล์นั้น
   - วางลงในช่อง SQL Editor บน Supabase
   - กดปุ่ม **"Run"** (หรือกดปุ่มลัด `Ctrl + Enter`)
6. เมื่อขึ้นข้อความ `Success. No rows returned`:
   - ระบบจะสร้างตาราง `users`, `shift_types`, `holidays`, `shifts`, `shift_swaps`, `daily_notes` ครบถ้วน
   - **ข้อมูลจริงของคุณจะถูกโอนย้ายเข้าทันที**:
     - บัญชีพนักงานเดิม 3 ท่าน (`0157`, `0533`, `0665`) พร้อมรหัสผ่านเดิม
     - กะเวรเดิมทั้ง 5 กะ (`M05`, `M09`, `M10`, `X`, `V`) พร้อมสีเดิม
     - ข้อมูลเวรที่ลงไว้แล้วในเดือนกันยายน 2569 ครบทั้ง 30 วัน
     - รายการวันหยุดประจำปี 2569

---

## ขั้นตอนที่ 2: คัดลอกค่าเชื่อมต่อ (API Keys) จาก Supabase

1. ในหน้า Supabase Dashboard คลิกที่ไอคอนเฟือง **"Project Settings"** (ด้านซ้ายล่าง)
2. เลือกหัวข้อ **"API"** ในเมนูย่อย
3. ให้คัดลอกค่า 2 ตัวนี้เก็บไว้ใน Notepad เพื่อนำไปใส่ใน Vercel:
   - **Project URL**: จะมีรูปแบบ เช่น `https://abcdefghijklm.supabase.co`
   - **Project API Keys** -> หัวข้อ `service_role` (secret):
     - ให้กดปุ่ม **"Reveal"** หรือปุ่มคัดลอกข้าง `service_role` (จะเป็นรหัสลับยาวๆ ขึ้นต้นด้วย `ey...`)
     - *(หมายเหตุ: ต้องใช้คีย์ `service_role` เนื่องจากระบบหลังบ้าน Node.js ต้องการสิทธิ์จัดการข้อมูลตารางเวรและผู้ใช้)*

---

## ขั้นตอนที่ 3: Deploy ขึ้น Vercel

คุณสามารถเลือกทำได้ 2 วิธีตามความสะดวก:

### วิธีที่ A: ผ่าน GitHub (แนะนำ สะดวก อัปเดตโค้ดให้อัตโนมัติเมื่อ push)

1. นำโค้ดโปรเจกต์นี้ขึ้น GitHub ของคุณ (สร้าง New Repository เช่น `shiftflow`)
2. ไปที่ [https://vercel.com/](https://vercel.com/) และล็อกอิน
3. ในหน้าแดชบอร์ด Vercel กดปุ่ม **"Add New..."** -> เลือก **"Project"**
4. เลือกเชื่อมต่อกับ Repository GitHub ของคุณที่เพิ่งสร้าง แล้วกด **"Import"**
5. ในหน้าตั้งค่าโปรเจกต์ (Configure Project):
   - **Framework Preset**: เลือก `Other` หรือปล่อยเป็นตามที่ตรวจจับได้
   - **Root Directory**: ปล่อยว่าง (เป็น `./`)
   - **Build and Output Settings**: ระบบจะอ่านจาก `vercel.json` ให้อัตโนมัติ
6. ขยายหัวข้อ **"Environment Variables"** แล้วกดเพิ่มตัวแปร 3 ตัวต่อไปนี้:
   | Key | Value (ค่าที่ต้องกรอก) |
   | :--- | :--- |
   | `SUPABASE_URL` | `https://bctyjfizqnnwdghybfha.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_publishable_izGd1wrMM0kjTdkLL8v2LQ_JFptbjEp` |
   | `JWT_SECRET` | `shiftflow_department_jwt_secret_key_2026_secure` |
7. กดปุ่ม **"Deploy"**
8. รอประมาณ 1-2 นาที เมื่อหน้าจอแสดง Congratulations และลูกโป่งพลุไฟขึ้น คุณจะได้ URL ประจำเว็บ เช่น `https://shiftflow-xxxx.vercel.app` 🎉

---

### วิธีที่ B: Deploy โดยตรงผ่าน Vercel CLI (ไม่ต้องใช้ GitHub)

หากในเครื่องไม่ได้ติดตั้ง Git หรือต้องการ deploy จากโฟลเดอร์นี้ทันที:

1. เปิด PowerShell ที่โฟลเดอร์โปรเจกต์นี้
2. สั่งล็อกอิน Vercel:
   ```powershell
   npx.cmd vercel login
   ```
   (เลือกวิธียืนยันตัวตนผ่านเบราว์เซอร์หรืออีเมลตามที่ขึ้นแจ้ง)
3. สั่งเริ่มต้นโปรเจกต์:
   ```powershell
   npx.cmd vercel
   ```
   - กด `Y` เพื่อยืนยัน
   - เลือก Account / Scope ของคุณ
   - Link to existing project? ตอบ `N`
   - Project name? กด `Enter` เพื่อใช้ชื่อเดิม
   - Which directory is your code located? กด `Enter` (คือ `./`)
   - Auto-detected settings -> กด `Enter`
4. เพิ่ม Environment Variables:
   ```powershell
   npx.cmd vercel env add SUPABASE_URL production
   # แล้ววาง URL ของ Supabase

   npx.cmd vercel env add SUPABASE_SERVICE_ROLE_KEY production
   # แล้ววาง service_role key ของ Supabase

   npx.cmd vercel env add JWT_SECRET production
   # แล้วใส่ข้อความลับ เช่น shiftflow_super_secret_jwt_2026_key
   ```
5. Deploy ขึ้น Production จริง:
   ```powershell
   npx.cmd vercel --prod
   ```
   เมื่อเสร็จสิ้น คุณจะได้รับลิงก์ URL ที่สามารถเข้าใช้งานได้ทั่วโลกทันที!

---

## ขั้นตอนที่ 4: ตรวจสอบและเริ่มต้นใช้งาน

1. เปิดเบราว์เซอร์เข้าลิงก์ของ Vercel ที่ได้รับ (เช่น `https://shiftflow-department.vercel.app`)
2. ล็อกอินเข้าใช้งานด้วยบัญชีผู้ดูแลระบบของคุณ:
   - **ชื่อผู้ใช้ (Username)**: `0157`
   - **รหัสผ่าน (Password)**: *รหัสผ่านที่คุณตั้งไว้เดิม*
3. ไปที่หน้า **"ตารางเวรแผนก"** -> คุณจะพบตารางเวรเดือนกันยายน 2569 ที่ลงข้อมูลไว้แล้วอย่างสมบูรณ์
4. ไปที่หน้า **"ตั้งค่าระบบ (Admin)"** -> สามารถจัดการเพิ่ม/ลบเจ้าหน้าที่, ปรับแต่งกะเวร หรือเพิ่มวันหยุดได้แบบเรียลไทม์

---

## 💡 สรุปไฟล์ที่จัดเตรียมไว้ให้พร้อม Deploy

- `supabase-schema.sql` : ไฟล์ SQL สำหรับนำเข้าตารางและข้อมูลจริงทั้งหมดขึ้น Supabase
- `server/dbAdapter.js` : ตัวแปลงฐานข้อมูลแบบ Hybrid อัตโนมัติ (อยู่บน Vercel ใช้ Supabase, อยู่ในเครื่องใช้ SQLite)
- `server/app.js` : แกนหลัก Backend Express API
- `api/index.js` : จุดเชื่อมต่อ Vercel Serverless Function
- `vercel.json` : ไฟล์กำหนดค่า Routing และ Build ให้ Frontend และ Backend ทำงานบนโดเมนเดียวกัน
- `.env.example` : ตัวอย่างค่าคอนฟิกตัวแปรระบบ
