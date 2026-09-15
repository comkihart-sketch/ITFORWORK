# 📱 คู่มือการตั้งค่า iPhone (iOS) สำหรับ ShiftFlow

คู่มือฉบับนี้ใช้สำหรับส่งให้พนักงานในแผนก เพื่อตั้งค่า **Widget ดูเวรบนหน้าจอ** และ **ระบบนาฬิกาปลุกอัตโนมัติ** (ปลุกเฉพาะวันที่มีเวร) บนเครื่อง iPhone ครับ

---

## 🌟 ส่วนที่ 1: การสร้าง Widget บนหน้าจอโฮม (ด้วยแอป Scriptable)
ใช้เพื่อแสดงตารางเวรของตัวเองและเพื่อนร่วมทีมบนหน้าจอโฮม อัปเดตอัตโนมัติทุกวัน

### ขั้นตอนการตั้งค่า
1. ดาวน์โหลดแอป **Scriptable** (ฟรี) จาก App Store
2. เปิดแอป กดเครื่องหมาย **`+`** มุมขวาบนสุดเพื่อสร้างสคริปต์ใหม่
3. แตะชื่อด้านบน (Untitled) เปลี่ยนชื่อเป็น **`ShiftFlow`**
4. คัดลอกโค้ดด้านล่างทั้งหมด ไปวางในหน้าแอป:

```javascript
// ==========================================
// ⚙️ การตั้งค่าส่วนตัว
// ==========================================
// ⚠️ เปลี่ยนเป็นรหัสพนักงานของคุณ
const USERNAME = "0157"; 

const SUPABASE_URL = "https://bctyjfizqnnwdghybfha.supabase.co";
const SUPABASE_KEY = "sb_publishable_izGd1wrMM0kjTdkLL8v2LQ_JFptbjEp";

// ==========================================
// 🚀 โค้ดสร้างหน้าตา Widget (ขนาด Medium)
// ==========================================
let widget = new ListWidget();
widget.backgroundColor = new Color("#ffffff");
widget.setPadding(16, 16, 16, 16);

function hexColor(str, fallback) {
  if (!str) return new Color(fallback);
  try { return new Color(str.replace(/[^0-9a-fA-F#]/g, '')); }
  catch { return new Color(fallback); }
}

try {
  let today = new Date();
  let dateStr = today.getFullYear() + "-" + 
                String(today.getMonth() + 1).padStart(2, '0') + "-" + 
                String(today.getDate()).padStart(2, '0');
  
  let df = new DateFormatter();
  df.dateFormat = "d MMM";
  let displayDate = df.string(today);

  let reqUsers = new Request(`${SUPABASE_URL}/rest/v1/users?select=id,username,full_name`);
  reqUsers.headers = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };
  
  let reqShifts = new Request(`${SUPABASE_URL}/rest/v1/shifts?shift_date=eq.${dateStr}&select=user_id,shift_type_id`);
  reqShifts.headers = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };
  
  let reqTypes = new Request(`${SUPABASE_URL}/rest/v1/shift_types?select=*`);
  reqTypes.headers = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

  let [users, shifts, types] = await Promise.all([
    reqUsers.loadJSON(), reqShifts.loadJSON(), reqTypes.loadJSON()
  ]);

  if (!users || users.length === 0) throw new Error("ไม่พบข้อมูลผู้ใช้");

  let typeMap = {};
  for (let t of types) typeMap[t.id] = t;

  let me = users.find(u => u.username === USERNAME);
  let others = users.filter(u => u.username !== USERNAME);

  let mainStack = widget.addStack();
  mainStack.layoutHorizontally();

  // 👉 คอลัมน์ซ้าย: เวรของฉัน
  let leftCol = mainStack.addStack();
  leftCol.layoutVertically();
  
  let titleStack = leftCol.addStack();
  titleStack.centerAlignContent();
  let titleText = titleStack.addText("📅 ShiftFlow");
  titleText.textColor = new Color("#4f46e5");
  titleText.font = Font.boldSystemFont(14);
  
  leftCol.addSpacer(4);
  let dateText = leftCol.addText(`เวรวันนี้ (${displayDate})`);
  dateText.font = Font.systemFont(12);
  dateText.textColor = new Color("#64748b");
  leftCol.addSpacer(8);

  let myShiftData = shifts.find(s => s.user_id === me.id);
  if (myShiftData && typeMap[myShiftData.shift_type_id]) {
    let shift = typeMap[myShiftData.shift_type_id];
    let shiftStack = leftCol.addStack();
    shiftStack.setPadding(6, 12, 6, 12);
    shiftStack.cornerRadius = 8;
    shiftStack.backgroundColor = hexColor(shift.color_bg, "#f1f5f9");

    let shiftCode = shiftStack.addText(shift.code);
    shiftCode.font = Font.boldSystemFont(22);
    shiftCode.textColor = hexColor(shift.color_text, "#0f172a");
    
    leftCol.addSpacer(6);
    let shiftTime = leftCol.addText(shift.name + "\n" + (shift.start_time || "") + " - " + (shift.end_time || ""));
    shiftTime.font = Font.systemFont(11);
    shiftTime.textColor = new Color("#334155");
  } else {
    let noShiftText = leftCol.addText("🎉 ไม่มีเวร");
    noShiftText.font = Font.boldSystemFont(20);
    noShiftText.textColor = new Color("#10b981");
    leftCol.addSpacer(4);
    let extraText = leftCol.addText("วันพักผ่อน");
    extraText.font = Font.systemFont(11);
    extraText.textColor = new Color("#64748b");
  }

  // เส้นคั่น
  mainStack.addSpacer(16);
  let divider = mainStack.addStack();
  divider.backgroundColor = new Color("#f1f5f9");
  divider.size = new Size(2, 0);
  mainStack.addSpacer(16);

  // 👉 คอลัมน์ขวา: เพื่อนร่วมทีม
  let rightCol = mainStack.addStack();
  rightCol.layoutVertically();
  
  let rightTitle = rightCol.addText("👥 เพื่อนร่วมทีม");
  rightTitle.font = Font.boldSystemFont(12);
  rightTitle.textColor = new Color("#94a3b8");
  rightCol.addSpacer(10);

  let displayOthers = others.slice(0, 3);
  for (let i = 0; i < displayOthers.length; i++) {
    let otherUser = displayOthers[i];
    let otherShiftData = shifts.find(s => s.user_id === otherUser.id);
    
    let shiftCodeStr = "หยุด";
    let shiftColorText = "#64748b";
    let shiftColorBg = "#f8fafc";
    
    if (otherShiftData && typeMap[otherShiftData.shift_type_id]) {
        let sType = typeMap[otherShiftData.shift_type_id];
        shiftCodeStr = sType.code;
        shiftColorText = sType.color_text;
        shiftColorBg = sType.color_bg;
    }

    let userRow = rightCol.addStack();
    userRow.layoutHorizontally();
    userRow.centerAlignContent();
    
    let shortName = otherUser.full_name.split(" ")[0];
    let nameText = userRow.addText(shortName);
    nameText.font = Font.systemFont(12);
    nameText.textColor = new Color("#334155");
    
    userRow.addSpacer(); 
    
    let pillStack = userRow.addStack();
    pillStack.setPadding(2, 6, 2, 6);
    pillStack.cornerRadius = 6;
    pillStack.backgroundColor = hexColor(shiftColorBg, "#f1f5f9");
    
    let codeText = pillStack.addText(shiftCodeStr);
    codeText.font = Font.boldSystemFont(11);
    codeText.textColor = hexColor(shiftColorText, "#0f172a");

    if (i < displayOthers.length - 1) rightCol.addSpacer(8);
  }
} catch (e) {
  let errText = widget.addText("⚠️ ขัดข้อง: " + e.message);
  errText.font = Font.systemFont(12);
  errText.textColor = Color.red();
}

widget.url = "https://itforworkart.vercel.app";
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium(); 
}
Script.complete();
```

5. **สำคัญ:** แก้ไขโค้ดบรรทัดที่ 5 (`const USERNAME = "0157";`) เป็นรหัสพนักงานของคุณ
6. กดปุ่ม `Done` มุมซ้ายบน
7. กลับไปที่หน้าจอโฮม แตะค้างพื้นที่ว่าง กดปุ่ม `+` ค้นหาแอป Scriptable เลือกขนาด **Medium (สี่เหลี่ยมผืนผ้า)**
8. แตะที่ตัว Widget เลือก Script เป็น `ShiftFlow` ถือเป็นอันเสร็จสิ้น!

---

## ⏰ ส่วนที่ 2: การตั้งนาฬิกาปลุกอัจฉริยะ (ปลุกเฉพาะวันที่มีเวร)
ใช้ฟีเจอร์คำสั่งลัด (Shortcuts) เพื่อให้เครื่องเช็กเวรล่วงหน้า และเปิดนาฬิกาปลุกให้อัตโนมัติ

### 1. เตรียมนาฬิกาปลุกในเครื่อง
1. เปิดแอป **นาฬิกา (Clock)**
2. สร้างนาฬิกาปลุกเวลา **`06:30`** ตั้งชื่อว่า `เวรเช้า` 
3. สร้างนาฬิกาปลุกเวลา **`10:00`** ตั้งชื่อว่า `เวรบ่าย`
4. **ปิดสวิตช์** นาฬิกาปลุกทั้ง 2 อันทิ้งไว้

### 2. ตั้งค่าการทำงานอัตโนมัติ (สำหรับเวรเช้า)
1. เปิดแอป **คำสั่งลัด (Shortcuts)** ไปที่แท็บ **การทำงานอัตโนมัติ (Automation)** 
2. กด `+` เลือก **เวลาของวัน (Time of Day)** 
3. ตั้งเวลาเป็น **`06:00`** (หรือเวลาที่ต้องการให้เช็กข้อมูลล่วงหน้าก่อนตื่น)
4. เลือก **ทำงานทันที (Run Immediately)** และกด ถัดไป
5. เลือก **การทำงานอัตโนมัติว่างเปล่า** แล้วกด **+ เพิ่มการทำงาน** และใส่ 4 กล่องนี้ตามลำดับ:

**📦 กล่องที่ 1:** ค้นหา `URL` วางลิงก์นี้:
```text
https://itforworkart.vercel.app/api/shortcut/check-shift?username=รหัสพนักงานของคุณ&period=morning
```
*(เช่น username=0157&period=morning)*

**📦 กล่องที่ 2:** ค้นหา `รับเนื้อหาของ URL` 

**📦 กล่องที่ 3:** ค้นหา `ถ้า` (If) 
- แตะเปลี่ยนเงื่อนไขเป็น **"ขึ้นต้นด้วย"**
- พิมพ์ช่องด้านหลังว่า **`YES`**

**📦 กล่องที่ 4:** ค้นหาที่แท็บแอป เลือกแอปนาฬิกา เลือก **`สลับระหว่างเปิดหรือปิดใช้การตั้งปลุก`** 
- ⚠️ ลากกล่องนี้ไปไว้ **ใต้** คำว่า "ถ้า"
- ตั้งค่าให้เป็น: **"เปิด"** ใช้ **"เวรเช้า"**

6. กด **เสร็จสิ้น** 

*(ทำขั้นตอนที่ 2 ซ้ำอีกรอบ สำหรับเวรบ่าย โดยเปลี่ยนเวลาเป็น 09:30, เปลี่ยนคำท้ายลิงก์เป็น `period=afternoon` และสั่งให้เปิดนาฬิกาปลุก "เวรบ่าย")*
