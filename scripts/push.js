require('dotenv').config();
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const readline = require('readline');

async function autoPush() {
  console.log('🚀 [ShiftFlow] กำลังเตรียมการอัปโหลดโค้ดขึ้น GitHub...');

  // 1. ตรวจสอบและ stage ไฟล์ทั้งหมด (อิงตาม .gitignore)
  const matrix = await git.statusMatrix({ fs, dir: '.' });
  let addedCount = 0;
  for (const row of matrix) {
    const [filepath, head, workdir, stage] = row;
    // workdir !== stage means modified or new
    if (workdir !== stage) {
      if (workdir === 0) {
        await git.remove({ fs, dir: '.', filepath });
      } else {
        await git.add({ fs, dir: '.', filepath });
      }
      addedCount++;
    }
  }

  // 2. Commit ถ้ามีการเปลี่ยนแปลง
  try {
    const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const sha = await git.commit({
      fs,
      dir: '.',
      message: `Update ShiftFlow: ${now}`,
      author: {
        name: 'Wuttichai',
        email: 'wuttichai@shiftflow.local'
      }
    });
    console.log(`✅ บันทึกประวัติ (Commit) เรียบร้อย: ${sha.substring(0, 7)}`);
  } catch (err) {
    console.log('ℹ️ ไม่มีการเปลี่ยนแปลงไฟล์ใหม่ที่ต้อง commit');
  }

  // 3. เตรียม Branch main
  try {
    await git.branch({ fs, dir: '.', ref: 'main', checkout: true });
  } catch (e) {}

  // 4. ตรวจสอบ Token สำหรับ Push
  let token = process.env.GITHUB_TOKEN || process.argv[2];

  if (!token) {
    console.log('\n🔒 ต้องใช้ GitHub Personal Access Token (Classic Token) เพื่อ Push ไปยัง GitHub');
    console.log('👉 หากยังไม่มี สามารถสร้างได้ฟรีที่: https://github.com/settings/tokens/new (ติ๊กถูกที่ช่อง [x] repo)');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    token = await new Promise((resolve) => {
      rl.question('\nกรุณาวาง GitHub Token ของคุณที่นี่: ', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
  }

  if (!token) {
    console.error('❌ ไม่พบ GitHub Token การ Push ถูกยกเลิก');
    process.exit(1);
  }

  console.log('\n📡 กำลัง Push โค้ดไปยัง https://github.com/comkihart-sketch/ITFORWORK.git (branch: main)...');

  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: '.',
      remote: 'origin',
      ref: 'main',
      onAuth: () => ({
        username: token,
        password: ''
      })
    });

    if (pushResult.ok) {
      console.log('\n🎉 สำเร็จ! อัปโหลดโค้ดทั้งหมดขึ้น GitHub เรียบร้อยแล้ว!');
      console.log('🔗 ตรวจสอบโค้ดได้ที่: https://github.com/comkihart-sketch/ITFORWORK\n');
    } else {
      console.error('❌ Push ไม่สำเร็จ:', pushResult);
    }
  } catch (err) {
    console.error('\n❌ เกิดข้อผิดพลาดในการ Push:', err.message);
    if (err.message.includes('401')) {
      console.error('💡 สาเหตุ: Token ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง repo นี้');
    }
  }
}

autoPush();
