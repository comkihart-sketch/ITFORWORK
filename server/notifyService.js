require('dotenv').config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '1453358180628299887';

/**
 * ส่งข้อความหรือ Embed ไปยัง Discord Channel ผ่าน REST API
 */
async function sendDiscordMessage({ content = null, embed = null }) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_CHANNEL_ID) {
    console.warn('[Notify] ไม่พบการตั้งค่า Discord Bot Token หรือ Channel ID');
    return false;
  }

  try {
    const payload = {};
    if (content) payload.content = content;
    if (embed) payload.embeds = [embed];

    const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Notify] ส่งแจ้งเตือน Discord ล้มเหลว:', res.status, errText);
      return false;
    }

    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error('[Notify] เกิดข้อผิดพลาดในการเชื่อมต่อ Discord:', err.message);
    return false;
  }
}

/**
 * แจ้งเตือน: มีการส่งคำขอสลับเวรใหม่
 */
async function notifySwapRequested({ requester, targetUser, shiftDate, requesterShift, targetShift, reason }) {
  const embed = {
    title: '🔄 มีคำขอสลับเวรใหม่ (Shift Swap Request)',
    color: 0xF59E0B, // Amber
    fields: [
      { name: '👤 ผู้ขอสลับ', value: `${requester.full_name} (${requester.username})`, inline: true },
      { name: '👥 ขอสลับกับ', value: `${targetUser.full_name} (${targetUser.username})`, inline: true },
      { name: '📅 ประจำวันที่', value: `${shiftDate}`, inline: true },
      { 
        name: '🔄 รายละเอียดการสลับกะ', 
        value: `**${requester.full_name}**: ${requesterShift || 'ไม่ระบุ'}\n⮂ **${targetUser.full_name}**: ${targetShift || 'ไม่ระบุ'}` 
      },
      { name: '💬 เหตุผลการขอสลับ', value: reason ? `"${reason}"` : 'ไม่ได้ระบุเหตุผล' },
      { name: '⏳ สถานะ', value: `รอคุณ **${targetUser.full_name}** เข้าสู่ระบบเพื่อกดอนุมัติ` }
    ],
    footer: { text: 'ShiftFlow • ระบบจัดตารางเวรและสลับกะแผนก' },
    timestamp: new Date().toISOString()
  };

  return sendDiscordMessage({
    content: `📢 **แจ้งเตือนคำขอสลับเวร:** คุณ **${targetUser.full_name}** มีคำขอสลับเวรจากคุณ **${requester.full_name}** ในวันที่ **${shiftDate}**`,
    embed
  });
}

/**
 * แจ้งเตือน: คำขอสลับเวรได้รับการอนุมัติแล้ว
 */
async function notifySwapApproved({ approver, requester, targetUser, shiftDate, requesterShift, targetShift }) {
  const embed = {
    title: '✅ อนุมัติการสลับเวรเรียบร้อยแล้ว (Swap Approved)',
    color: 0x10B981, // Emerald Green
    fields: [
      { name: '✅ ผู้อนุมัติ', value: `${approver.full_name} (${approver.username})`, inline: true },
      { name: '📅 ประจำวันที่', value: `${shiftDate}`, inline: true },
      { name: '👥 คู่สลับเวร', value: `${requester.full_name} ⮂ ${targetUser.full_name}`, inline: false },
      { 
        name: '📋 ตารางเวรใหม่ที่อัปเดตแล้ว', 
        value: `• **${requester.full_name}**: ได้รับกะ ${targetShift || '-'}\n• **${targetUser.full_name}**: ได้รับกะ ${requesterShift || '-'}` 
      },
      { name: '✨ ผลลัพธ์', value: 'ตารางเวรส่วนตัวและตารางเวรรวมของแผนกได้รับการอัปเดตเรียบร้อยแล้ว' }
    ],
    footer: { text: 'ShiftFlow • ระบบจัดตารางเวรและสลับกะแผนก' },
    timestamp: new Date().toISOString()
  };

  return sendDiscordMessage({
    content: `🎉 **การสลับเวรสำเร็จ:** คุณ **${approver.full_name}** ได้อนุมัติการสลับเวรวันที่ **${shiftDate}** เรียบร้อยแล้ว`,
    embed
  });
}

/**
 * แจ้งเตือน: คำขอสลับเวรถูกปฏิเสธ
 */
async function notifySwapRejected({ rejector, requester, shiftDate, reason }) {
  const embed = {
    title: '❌ ปฏิเสธคำขอสลับเวร (Swap Rejected)',
    color: 0xEF4444, // Rose Red
    fields: [
      { name: '❌ ผู้ปฏิเสธ', value: `${rejector.full_name} (${rejector.username})`, inline: true },
      { name: '👤 ผู้ขอสลับ', value: `${requester.full_name} (${requester.username})`, inline: true },
      { name: '📅 ประจำวันที่', value: `${shiftDate}`, inline: true },
      { name: '💬 เหตุผลที่ปฏิเสธ', value: reason ? `"${reason}"` : 'ไม่ได้ระบุเหตุผล' },
      { name: '📌 ผลลัพธ์', value: 'กะเวรเดิมของทั้งสองฝ่ายยังคงไม่มีการเปลี่ยนแปลง' }
    ],
    footer: { text: 'ShiftFlow • ระบบจัดตารางเวรและสลับกะแผนก' },
    timestamp: new Date().toISOString()
  };

  return sendDiscordMessage({
    content: `⚠️ **คำขอสลับเวรถูกปฏิเสธ:** คุณ **${rejector.full_name}** ได้ปฏิเสธคำขอสลับเวรวันที่ **${shiftDate}**`,
    embed
  });
}

/**
 * แจ้งเตือน: มีการลงเวรหรือเปลี่ยนแปลงเวรในระบบ
 */
async function notifyShiftChanged({ actor, targetUser, shiftDate, shiftType, note }) {
  const embed = {
    title: '📅 มีการลงเวร / ปรับเปลี่ยนเวร (Shift Updated)',
    color: 0x6366F1, // Indigo
    fields: [
      { name: '👤 ผู้ปฏิบัติงาน', value: `${targetUser.full_name} (${targetUser.username})`, inline: true },
      { name: '📅 วันที่', value: `${shiftDate}`, inline: true },
      { 
        name: '🏷️ กะเวร', 
        value: `**${shiftType.name}** (${shiftType.code}) [${shiftType.start_time || '-'} - ${shiftType.end_time || '-'}]`,
        inline: false 
      },
      { name: '✍️ ดำเนินการโดย', value: `${actor.full_name} (${actor.role})`, inline: true },
      { name: '📝 บันทึกเพิ่มเติม', value: note ? `"${note}"` : '-', inline: true }
    ],
    footer: { text: 'ShiftFlow • ระบบจัดตารางเวรและสลับกะแผนก' },
    timestamp: new Date().toISOString()
  };

  return sendDiscordMessage({
    embed
  });
}

module.exports = {
  sendDiscordMessage,
  notifySwapRequested,
  notifySwapApproved,
  notifySwapRejected,
  notifyShiftChanged
};
