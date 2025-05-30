// 📦 นำเข้าโมดูลที่จำเป็น
const TelegramBot = require('node-telegram-bot-api');
const request = require('request').defaults({ jar: true });
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// 🔑 ใส่โทเคนบอท Telegram ของคุณที่นี่
const token = '8091888002:AAE8ZVkBgZoxIFSMsgUdKRjeCYMxCEh2vlA'; // แทนที่ด้วยโทเคนของคุณ

// 🤖 สร้างบอทที่ใช้ 'polling' ในการรับข้อความใหม่
const bot = new TelegramBot(token, { polling: true });

// 🗂️ เก็บสถานะของผู้ใช้ในการสนทนา
const userSessions = {};

// 📲 เบอร์มือถือที่ใช้ในการรับเงิน TrueMoney
const mobileNumber = '0994847095'; // เปลี่ยนเป็นเบอร์ของคุณ

// 🤖 เก็บชื่อผู้ใช้ของบอท
let botUsername = '';
bot.getMe().then((botInfo) => {
  botUsername = botInfo.username;
});

// 🔑 ฟังก์ชันสำหรับแรนดอม UUID
function generateUUID() {
  return uuidv4();
}

// ⏳ ฟังก์ชันสำหรับสร้างเวลา expiryTime
function generateExpiryTime(timeAmount, timeUnit) {
  const now = new Date();
  let expiryDate = new Date(now);
  if (timeUnit === 'day') {
    expiryDate.setDate(now.getDate() + timeAmount);
  } else if (timeUnit === 'hour') {
    expiryDate.setHours(now.getHours() + timeAmount);
  } else if (timeUnit === 'minute') {
    expiryDate.setMinutes(now.getMinutes() + timeAmount);
  }
  return expiryDate.getTime();
}

// 🔐 ฟังก์ชันสำหรับเข้าสู่ระบบ (รองรับหลาย VPS)
function login(vpsType, callback) {
  let loginOptions = {
    method: 'POST',
    url: '',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {}
  };

  if (vpsType === 'IDC') {
    loginOptions.url = 'https://tha1.thatoeyvpn.online:1111/vpn/login';
    loginOptions.form = {
      'username': 'zazacvcv02',
      'password': 'zazacvcv02'
    };
  } else if (vpsType === 'home') {
    loginOptions.url = 'https://th4.thatoeyvpn.online:1111/vpn/login';
    loginOptions.form = {
      'username': 'zazacvcv02',
      'password': 'zazacvcv02'
    };
  } else {
    console.error('❌ ไม่ทราบประเภท VPS:', vpsType);
    callback(new Error('Unknown VPS type'));
    return;
  }

  request(loginOptions, function (error, response) {
    if (error) {
      console.error('🚫 เกิดข้อผิดพลาดในการเข้าสู่ระบบ:', error);
      callback(error);
      return;
    }
    try {
      const body = JSON.parse(response.body);
      if (body.success) {
        console.log('✅ เข้าสู่ระบบสำเร็จ:', body.msg);
        callback(null);
      } else {
        console.log('🚫 เข้าสู่ระบบล้มเหลว:', body.msg);
        callback(new Error(body.msg));
      }
    } catch (e) {
      console.error('🚫 ไม่สามารถแปลงข้อมูลการตอบกลับเป็น JSON ได้:', e);
      console.log('📥 Response Body:', response.body);
      callback(e);
    }
  });
}

// 👥 ฟังก์ชันสำหรับเพิ่มลูกค้าใหม่ (รองรับหลาย VPS)
function addNewClient(session, successCallback, errorCallback) {
  const clientUUID = generateUUID();
  const expiryTime = session.expiryTime || generateExpiryTime(session.timeAmount, session.timeUnit);
  const totalGB = session.gbLimit > 0 ? session.gbLimit * 1024 * 1024 * 1024 : 0;
  const ipLimit = session.ipLimit > 0 ? session.ipLimit : 0; // ดึงจำนวน IP

  let apiUrl = '';
  let apiSettings = {};

  if (session.vpsType === 'IDC') {
    apiUrl = 'https://tha1.thatoeyvpn.online:1111/vpn/panel/api/inbounds/addClient';
    apiSettings = {
      clients: [{
        id: clientUUID,
        alterId: 0,
        email: session.codeName,
        limitIp: ipLimit || 2, // ใช้จำนวน IP ที่ผู้ใช้ระบุหรือค่าเริ่มต้น
        totalGB: totalGB > 0 ? totalGB : 0,
        expiryTime: expiryTime,
        enable: true,
        tgId: '',
        subId: ''
      }]
    };
  } else if (session.vpsType === 'home') {
    apiUrl = 'https://th4.thatoeyvpn.online:1111/vpn/panel/api/inbounds/addClient';
    apiSettings = {
      clients: [{
        id: clientUUID,
        alterId: 0,
        email: session.codeName,
        limitIp: ipLimit || 2, // ใช้จำนวน IP ที่ผู้ใช้ระบุหรือค่าเริ่มต้น
        totalGB: totalGB > 0 ? totalGB : 0,
        expiryTime: expiryTime,
        enable: true,
        tgId: '',
        subId: ''
      }]
    };
  } else {
    console.error('❌ ไม่ทราบประเภท VPS:', session.vpsType);
    errorCallback('Unknown VPS type');
    return;
  }

  const options = {
    method: 'POST',
    url: apiUrl,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: session.apiId,
      settings: JSON.stringify(apiSettings)
    })
  };

  request(options, function (error, response) {
    if (error) {
      console.error('🚫 เกิดข้อผิดพลาดในการส่งคำขอ:', error);
      errorCallback('เกิดข้อผิดพลาดในการส่งคำขอ');
      return;
    }
    try {

      const body = JSON.parse(response.body);

      if (body.success) {

        console.log('✅ เพิ่มลูกค้าสำเร็จ:', body.msg);

        let clientCode = '';

        if (session.vpsType === 'IDC') {

          if (session.type === 'true_pro_facebook') {

            clientCode = `vless://${clientUUID}@tha1.thatoeyvpn.online:8000?type=tcp&security=tls&fp=chrome&alpn=h3%2Ch2%2Chttp%2F1.1&allowInsecure=1&sni=connect.facebook.net#${encodeURIComponent(session.codeName)}`;

          } else if (session.type === 'ais') {

            clientCode = `vless://${clientUUID}@tha1.thatoeyvpn.online:8080?type=ws&path=%2Fvpnws&host=speedtest.net&security=none#${encodeURIComponent(session.codeName)}`;

          } else if (session.type === 'true_zoom') {

            clientCode = `vless://${clientUUID}@support.zoom.us:8443?type=ws&path=%2F&host=tha1.thatoeyvpn.online&security=tls&fp=chrome&alpn=h3%2Ch2%2Chttp%2F1.1&sni=tha1.thatoeyvpn.online#${encodeURIComponent(session.codeName)}`;

          }

        } else if (session.vpsType === 'home') {

          if (session.type === 'true_pro_facebook') {

            clientCode = `vless://${clientUUID}@th4.thatoeyvpn.online:8000?type=tcp&security=tls&fp=chrome&alpn=h3%2Ch2%2Chttp%2F1.1&allowInsecure=1&sni=connect.facebook.net#${encodeURIComponent(session.codeName)}`;

          } else if (session.type === 'ais') {

            clientCode = `vless://${clientUUID}@th4.thatoeyvpn.online:8080?type=ws&path=%2Fvpnws&host=speedtest.net&security=none#${encodeURIComponent(session.codeName)}`;

          } else if (session.type === 'true_zoom') {

            clientCode = `vless://${clientUUID}@support.zoom.us:8443?type=ws&path=%2F&host=th4.thatoeyvpn.online&security=tls&fp=chrome&alpn=h3%2Ch2%2Chttp%2F1.1&sni=th4.thatoeyvpn.online#${encodeURIComponent(session.codeName)}`;

          }

        }

        successCallback(clientCode, expiryTime);

      } else {

        console.log('🚫 การเพิ่มลูกค้าล้มเหลว:', body.msg);

        errorCallback(body.msg);

      }

    } catch (e) {

      console.error('🚫 ไม่สามารถแปลงข้อมูลการตอบกลับเป็น JSON ได้:', e);

      console.log('📥 Response Body:', response.body);

      errorCallback('ไม่สามารถแปลงข้อมูลการตอบกลับเป็น JSON ได้');

    }
  });
}

// 💸 ฟังก์ชันสำหรับจัดการลิงก์ซองอั่งเปา TrueMoney
function processTrueMoneyGiftCode(chatId, code) {
  const options = {
    method: 'POST',
    url: `https://store.cyber-safe.pro/api/topup/truemoney/angpaofree/`,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Connection': 'keep-alive'
    },
    body: JSON.stringify({
      mobile: mobileNumber,
      voucher_hash: code,
      type: 'wallet'
    })
  };

  request(options, function(error, response) {
    if (error) {
      console.error('🚫 เกิดข้อผิดพลาดในการส่งคำขอ:', error);
      bot.sendMessage(chatId, '🚫 เกิดข้อผิดพลาดในการรับเงิน โปรดลองใหม่อีกครั้ง');
      return;
    }

    if (response.statusCode === 200) {
      try {
        const body = JSON.parse(response.body);
        if (body && body.status === 'success' && body.amount) {
          const amount = parseFloat(body.amount);
          let creditsToAdd = amount;
          if (amount === 100) {
            creditsToAdd += 20; // เติม 100 บาท รับเพิ่มอีก 20 เครดิต
          }
          bot.sendMessage(chatId, `🎉 รับเงินจำนวน ${amount} บาท เรียบร้อยแล้ว! คุณได้รับ ${creditsToAdd} เครดิต ขอบคุณที่สนับสนุนเราครับ 🙏`);
          updateUserCredits(chatId, creditsToAdd);
        } else {
          bot.sendMessage(chatId, `🚫 เกิดข้อผิดพลาดในการรับเงิน: ${body.message || 'ไม่สามารถประมวลผลได้'}`);
        }
      } catch (e) {
        console.error('🚫 Error parsing response:', e);
        bot.sendMessage(chatId, '🚫 เกิดข้อผิดพลาดในการประมวลผลข้อมูล');
      }
    } else {
      console.log('📥 Response:', response.statusCode, response.body);
      bot.sendMessage(chatId, '🚫 เกิดข้อผิดพลาดในการรับเงิน โปรดตรวจสอบลิงก์และลองใหม่อีกครั้ง');
    }
  });
}

// 💹 ฟังก์ชันสำหรับตรวจสอบสลิปการโอนเงินธนาคาร
function verifyBankSlip(chatId, photoId) {
  const axios = require('axios');
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');
  
  // ดาวน์โหลดรูปภาพจาก Telegram
  bot.getFileLink(photoId).then((fileUrl) => {
    const tempFilePath = path.join(__dirname, `slip_${Date.now()}.jpg`);
    
    // ดาวน์โหลดไฟล์
    axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    }).then((response) => {
      // บันทึกไฟล์ไว้ชั่วคราว
      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);
      
      writer.on('finish', () => {
        bot.sendMessage(chatId, '🔍 *กำลังตรวจสอบสลิป... โปรดรอสักครู่*', { parse_mode: 'Markdown' });
        
        // สร้าง Form Data
        const form = new FormData();
        form.append('ClientID-Secret', '724861967e526db0e0:176024e742245df57ead8ba17ceddae6f7098ee783644661'); // แทนที่ด้วย API Key ของคุณ
        form.append('image', fs.createReadStream(tempFilePath));
        
        // ส่งคำขอไปยัง API
        axios.post('https://thaislip.xncly.xyz/api/v1/slipverify-bank', form, {
          headers: form.getHeaders()
        }).then((res) => {
          const result = res.data;
          
          if (result.status === 'success') {
            // คำนวณเครดิตที่จะได้รับ
            const amount = parseFloat(result.amount) || 0;
            let creditsToAdd = amount;
            if (amount === 100) {
              creditsToAdd += 20; // เติม 100 บาท รับเพิ่มอีก 20 เครดิต
            }
            
            // สร้างข้อความสรุป
            let summaryMessage = `✅ *ตรวจสอบสลิปสำเร็จ!*\n\n` +
                            `💰 *จำนวนเงิน:* ${amount} บาท\n` +
                            `🏦 *ธนาคารผู้รับ:* ${result.bank_receiver || 'กสิกรไทย'}\n` +
                            `👤 *ชื่อผู้รับ:* ${result.account_receiver || 'เจนณรงค์ รูปต่ำ'}\n` +
                            `📅 *วันที่:* ${result.date || 'ไม่ระบุ'}\n` +
                            `⏰ *เวลา:* ${result.time || 'ไม่ระบุ'}\n` +
                            `💎 *ได้รับเครดิต:* ${creditsToAdd} เครดิต\n\n` +
                            `🎉 *ระบบได้เพิ่มเครดิตให้คุณเรียบร้อยแล้ว!*`;
            
            bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' });
            
            // อัพเดทเครดิตของผู้ใช้
            updateUserCredits(chatId, creditsToAdd);
          } else {
            bot.sendMessage(chatId, `❌ *การตรวจสอบล้มเหลว:* ${result.message || 'ไม่สามารถตรวจสอบสลิปได้'}`, { parse_mode: 'Markdown' });
          }
          
          // ลบไฟล์ชั่วคราว
          fs.unlinkSync(tempFilePath);
        }).catch((error) => {
          console.error('🚫 Error verifying slip:', error);
          bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการตรวจสอบสลิป โปรดลองอีกครั้ง*', { parse_mode: 'Markdown' });
          
          // ลบไฟล์ชั่วคราว
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        });
      });
      
      writer.on('error', (err) => {
        console.error('🚫 Error saving temporary file:', err);
        bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการบันทึกไฟล์ โปรดลองอีกครั้ง*', { parse_mode: 'Markdown' });
      });
    }).catch((error) => {
      console.error('🚫 Error downloading image:', error);
      bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ โปรดลองอีกครั้ง*', { parse_mode: 'Markdown' });
    });
  }).catch((error) => {
    console.error('🚫 Error getting file link:', error);
    bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการดึงลิงค์ไฟล์ โปรดลองอีกครั้ง*', { parse_mode: 'Markdown' });
  });
}

// 💸 ฟังก์ชันสำหรับตรวจสอบสลิปวอเล็ท TrueMoney
function verifyTrueMoneyWalletSlip(chatId, photoId) {
  const axios = require('axios');
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');
  
  // ดาวน์โหลดรูปภาพจาก Telegram
  bot.getFileLink(photoId).then((fileUrl) => {
    const tempFilePath = path.join(__dirname, `tw_slip_${Date.now()}.jpg`);
    
    // ดาวน์โหลดไฟล์
    axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    }).then((response) => {
      // บันทึกไฟล์ไว้ชั่วคราว
      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);
      
      writer.on('finish', () => {
        bot.sendMessage(chatId, '🔍 *กำลังตรวจสอบสลิปวอเล็ท TrueMoney... โปรดรอสักครู่*', { parse_mode: 'Markdown' });
        
        // สร้าง Form Data
        const form = new FormData();
        form.append('ClientID-Secret', '1234567890:abcdefg'); // แทนที่ด้วย API Key ของคุณ
        form.append('image', fs.createReadStream(tempFilePath));
        
        // ส่งคำขอไปยัง API
        axios.post('https://thaislip.xncly.xyz/api/v1/slipverify-tw', form, {
          headers: form.getHeaders()
        }).then((res) => {
          const result = res.data;
          
          if (result.status === 'success') {
            // คำนวณเครดิตที่จะได้รับ
            const amount = parseFloat(result.amount) || 0;
            let creditsToAdd = amount;
            if (amount === 100) {
              creditsToAdd += 20; // เติม 100 บาท รับเพิ่มอีก 20 เครดิต
            }
            
            // สร้างข้อความสรุป
            let summaryMessage = `✅ *ตรวจสอบสลิปวอเล็ทสำเร็จ!*\n\n` +
                            `💰 *จำนวนเงิน:* ${amount} บาท\n` +
                            `📱 *เบอร์โทร:* ${result.phone_number || 'ไม่ระบุ'}\n` +
                            `📅 *วันที่:* ${result.date || 'ไม่ระบุ'}\n` +
                            `⏰ *เวลา:* ${result.time || 'ไม่ระบุ'}\n` +
                            `📝 *รายละเอียด:* ${result.detail || 'ไม่ระบุ'}\n` +
                            `💎 *ได้รับเครดิต:* ${creditsToAdd} เครดิต\n\n` +
                            `🎉 *ระบบได้เพิ่มเครดิตให้คุณเรียบร้อยแล้ว!*`;
            
            bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' });
            
            // อัพเดทเครดิตของผู้ใช้
            updateUserCredits(chatId, creditsToAdd);
          } else {
            bot.sendMessage(chatId, `❌ *การตรวจสอบล้มเหลว:* ${result.message || 'ไม่สามารถตรวจสอบสลิปได้'}`, { parse_mode: 'Markdown' });
          }
          
          // ลบไฟล์ชั่วคราว
          fs.unlinkSync(tempFilePath);
        }).catch((error) => {
          console.error('🚫 Error verifying TrueMoney slip:', error);
          bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการตรวจสอบสลิปวอเล็ท โปรดลองอีกครั้ง*', { parse_mode: 'Markdown' });
          
          // ลบไฟล์ชั่วคราว
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        });
      });
      
      writer.on('error', (err) => {
        console.error('🚫 Error saving temporary file:', err);
        bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการบันทึกไฟล์ โปรดลองอีกครั้ง*', { parse_mode: 'Markdown' });
      });
    }).catch((error) => {
      console.error('🚫 Error downloading image:', error);
      bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ โปรดลองอีกครั้ง*', { parse_mode: 'Markdown' });
    });
  }).catch((error) => {
    console.error('🚫 Error getting file link:', error);
    bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการดึงลิงค์ไฟล์ โปรดลองอีกครั้ง*', { parse_mode: 'Markdown' });
  });
}

// 💰 ฟังก์ชันสำหรับอัปเดตเครดิตของผู้ใช้
let usersData = {};

// 📄 ชื่อไฟล์ที่ใช้เก็บข้อมูลผู้ใช้
const dataFilePath = path.join(__dirname, 'transactions.json');

// 📥 อ่านข้อมูลผู้ใช้จากไฟล์เมื่อเริ่มต้นโปรแกรม
if (fs.existsSync(dataFilePath)) {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    usersData = JSON.parse(data);

    // เพิ่ม expiryTime ให้กับโค้ดที่ยังไม่มี
    for (let userId in usersData) {
      usersData[userId].codes.forEach(codeEntry => {
        if (!codeEntry.expiryTime) {
          const creationDate = new Date(codeEntry.creationDate);
          const expiryDate = new Date(creationDate);
          expiryDate.setDate(creationDate.getDate() + 30);
          codeEntry.expiryTime = expiryDate.getTime();
        }
      });
    }

    fs.writeFileSync(dataFilePath, JSON.stringify(usersData, null, 2));
  } catch (err) {
    console.error('🚫 Error reading transactions.json:', err);
    usersData = {};
  }
} else {
  usersData = {};
  fs.writeFileSync(dataFilePath, JSON.stringify(usersData, null, 2));
}

function getUserData(userId) {
  return usersData[userId] || { credits: 0, codes: [], trialCodesCount: 0, lastTrialResetMonth: new Date().getMonth() };
}

function saveUserData(userId, data) {
  usersData[userId] = data;
  fs.writeFile(dataFilePath, JSON.stringify(usersData, null, 2), (err) => {
    if (err) {
      console.error(`🚫 Error writing ${dataFilePath}:`, err);
    }
  });
}

function updateUserCredits(chatId, amount) {
  const userId = chatId.toString();
  let userData = getUserData(userId);
  let currentCredits = userData.credits || 0;

  const newCredits = currentCredits + amount;
  userData.credits = newCredits;
  saveUserData(userId, userData);

  bot.sendMessage(chatId, `💎 ยอดเครดิตปัจจุบันของคุณคือ ${newCredits} เครดิต`);
}

// 👑 เพิ่มรายการของแอดมิน
const adminIds = [1017223256]; // แทนที่ด้วย Telegram ID ของแอดมิน

// 🏁 รับคำสั่ง /start จากผู้ใช้
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const message = `✨ *ยินดีต้อนรับสู่ระบบบริการสุดไฮเทค!* ✨\n\n` +
                  `📜 *คำสั่งทั้งหมด:*\n\n` +
                  `🚀 /addclient - *สร้างโค้ดใหม่*\n` +
                  `💳 /topup - *เติมเงินเพื่อรับเครดิต*\n` +
                  `💰 /mycredits - *ตรวจสอบเครดิตของคุณ*\n` +
                  `📄 /mycodes - *ดูโค้ดที่คุณสร้างไว้*\n` +
                  `🆓 /trialcode - *ทดลองใช้โค้ดฟรี*\n` +
                  `🤝 /transfercredits - *โอนเครดิตให้ผู้ใช้อื่น*\n\n` +
                  `⚡️ *Tip:* พิมพ์ /help เพื่อดูคำสั่งทั้งหมดหรือสอบถามเพิ่มเติม!`;
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// 💳 รับคำสั่ง /topup (ปรับแต่งไฮเทค)
bot.onText(/\/topup/, (msg) => {
  const chatId = msg.chat.id;

  if (msg.chat.type === 'private') {
    const message = 
`💠💠💠💠💠💠💠💠💠
*⚡️ Hi-Tech Top-Up System ⚡️*
💠💠💠💠💠💠💠💠💠

✨ *ขั้นตอนการเติมเครดิต:*
1. 🔗 ส่ง *ลิงก์ซองอั่งเปาวอเลท* ให้บอท (ลิงก์รูปแบบ: https://gift.truemoney.com/campaign/?v=xxxxx)
2. ⏳ รอสักครู่ ระบบ AI ประมวลผลอย่างรวดเร็ว
3. 💎 รับเครดิตของคุณและพร้อมใช้งานทันที!

🎁 *โปรโมชั่นพิเศษ!*
💰 เติม 100 บาท รับฟรีอีก 20 เครดิต!

*Tip:* ยิ่งเติมมาก ยิ่งคุ้มมาก! 🚀
`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } else {
    const options = {
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 เริ่มเติมเงินกับบอท', url: `https://t.me/${botUsername}?start=topup` }]
        ]
      }
    };
    const message = `⚠️ *โปรดเติมเงินผ่านแชทส่วนตัวกับบอท!* ⚠️\n\n` +
                    `🎁 *โปรโมชั่นสุดพิเศษ!* เติม 100 บาท รับเพิ่มอีก 20 เครดิต\n\n` +
                    `📲 คลิกที่ปุ่มด้านล่างเพื่อเริ่มต้น`;
    bot.sendMessage(chatId, message, options);
  }
});

// 💰 รับคำสั่ง /mycredits
bot.onText(/\/mycredits/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  let userData = getUserData(userId);
  let credits = userData.credits || 0;
  bot.sendMessage(chatId, `💎 *ยอดเครดิตของคุณคือ:* ${credits} เครดิต`, { parse_mode: 'Markdown' });
});

// 📄 รับคำสั่ง /mycodes
bot.onText(/\/mycodes/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  let userData = getUserData(userId);
  if (userData.codes && userData.codes.length > 0) {
    let response = `📜 *โค้ดทั้งหมดของคุณ:*\n\n`;
    const nowTime = Date.now();
    userData.codes.forEach((codeEntry, index) => {
      if (codeEntry.expiryTime) {
        const timeLeft = codeEntry.expiryTime - nowTime;
        if (timeLeft > 0) {
          let timeString = '';
          const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
          const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
          if (days > 0) timeString += `${days} วัน `;
          if (hours > 0) timeString += `${hours} ชั่วโมง `;
          if (minutes > 0) timeString += `${minutes} นาที `;
          response += `🔹 *${index + 1}. ${codeEntry.codeName}:* ยังเหลือเวลา ${timeString.trim()}\n`;
        } else {
          response += `🔹 *${index + 1}. ${codeEntry.codeName}:* ❌ หมดอายุ\n`;
        }
      } else {
        response += `🔹 *${index + 1}. ${codeEntry.codeName}:* ไม่จำกัดเวลา\n`;
      }
    });
    bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, '❌ *คุณยังไม่มีโค้ดใดๆ*', { parse_mode: 'Markdown' });
  }
});

// 🆓 รับคำสั่ง /trialcode (สร้างโค้ดทดลองใช้)
bot.onText(/\/trialcode/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const userIdStr = userId.toString();
  let userData = getUserData(userIdStr);
  const currentMonth = new Date().getMonth();

  if (!userData.lastTrialResetMonth || userData.lastTrialResetMonth !== currentMonth) {
    userData.trialCodesCount = 0;
    userData.lastTrialResetMonth = currentMonth;
    saveUserData(userIdStr, userData);
  }

  if (userData.trialCodesCount >= 3) {
    bot.sendMessage(chatId, '🚫 *คุณใช้โค้ดทดลองครบ 3 ครั้งในเดือนนี้แล้ว*', { parse_mode: 'Markdown' });
  } else {
    if (msg.chat.type === 'supergroup' && chatId === -1002540868981) { // แทนที่ด้วย Telegram Group ID ของคุณ
      const options = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 สำหรับเกม VPS (IDC)', callback_data: 'vps_IDC_trial' }],
            [{ text: '🌐 สำหรับเน็ตทั่วไปเน็ตบ้าน (home)', callback_data: 'vps_home_trial' }]
          ]
        }
      };
      bot.sendMessage(chatId, '🔧 *เลือกประเภท VPS สำหรับโค้ดทดลอง:*', options).then(sentMessage => {
        if (!userSessions[userId]) {
          userSessions[userId] = {};
        }
        userSessions[userId].chatId = chatId;
        userSessions[userId].originalMessageId = sentMessage.message_id;
        userSessions[userId].isTrial = true;
      });
    } else {
      bot.sendMessage(chatId, '⚠️ *ใช้คำสั่งนี้ได้เฉพาะในกลุ่มที่กำหนดเท่านั้น!*', { parse_mode: 'Markdown' });
    }
  }
});

// 🤝 รับคำสั่ง /transfercredits (โอนเครดิต)
bot.onText(/\/transfercredits/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // เริ่มต้นขั้นตอนการโอนเครดิต
  // ขั้นตอน: ให้ผู้ใช้ตอบกลับข้อความของผู้ใช้เป้าหมาย
  if (!userSessions[userId]) {
    userSessions[userId] = {};
  }
  userSessions[userId].step = 'transfer_ask_user';

  const message =
`🤝 *ระบบโอนเครดิตสุดไฮเทค!*

1. โปรด *ตอบกลับ (Reply)* ข้อความของผู้ใช้ที่คุณต้องการโอนเครดิตให้
2. หลังจากนั้นบอทจะถามจำนวนเครดิตที่ต้องการโอน

💎 สะดวก รวดเร็ว และปลอดภัย!`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// 👑 รับคำสั่ง /givecredits สำหรับแอดมิน
bot.onText(/\/givecredits/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (adminIds.includes(userId)) {
    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '👥 เพิ่มเครดิตให้ผู้ใช้ (ตอบกลับข้อความเป้าหมาย)', callback_data: 'givecredits_to_user' }],
          [{ text: '🙋‍♂️ เพิ่มเครดิตให้ตัวเอง', callback_data: 'givecredits_to_self' }]
        ]
      }
    };
    bot.sendMessage(chatId, '🔧 *เลือกตัวเลือก:*', options);
  } else {
    bot.sendMessage(chatId, '🚫 *คำสั่งนี้สำหรับแอดมินเท่านั้น!*', { parse_mode: 'Markdown' });
  }
});

// 👑 รับคำสั่ง /allcodes สำหรับแอดมิน (ดูโค้ดทั้งหมดของผู้ใช้)
bot.onText(/\/allcodes/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (adminIds.includes(userId)) {
    let response = '📄 *รายการโค้ดทั้งหมด:*\n\n';
    for (let uid in usersData) {
      if (usersData[uid].codes && usersData[uid].codes.length > 0) {
        response += `👤 *User ID: ${uid}*\n`;
        const nowTime = Date.now();
        usersData[uid].codes.forEach((codeEntry) => {
          if (codeEntry.expiryTime) {
            const timeLeft = codeEntry.expiryTime - nowTime;
            if (timeLeft > 0) {
              let timeString = '';
              const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
              const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
              const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
              if (days > 0) timeString += `${days} วัน `;
              if (hours > 0) timeString += `${hours} ชั่วโมง `;
              if (minutes > 0) timeString += `${minutes} นาที `;
              response += `   🔹 ${codeEntry.codeName}: ${codeEntry.code} - เหลือเวลา ${timeString.trim()}\n`;
            } else {
              response += `   🔹 ${codeEntry.codeName}: ${codeEntry.code} - ❌ หมดอายุ\n`;
            }
          } else {
            response += `   🔹 ${codeEntry.codeName}: ${codeEntry.code} - ไม่จำกัดเวลา\n`;
          }
        });
        response += '\n';
      }
    }
    bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, '🚫 *คำสั่งนี้สำหรับแอดมินเท่านั้น!*', { parse_mode: 'Markdown' });
  }
});

// 🚀 รับคำสั่ง /addclient (สร้างโค้ดใหม่)
bot.onText(/\/addclient/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // ตรวจสอบว่าอยู่ในกลุ่มที่กำหนดหรือไม่
  if (chatId === -1002540868981) { // แทนที่ด้วย Telegram Group ID ของคุณ
    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 สำหรับเกม VPS (IDC)', callback_data: 'vps_IDC' }],
          [{ text: '🌐 สำหรับเน็ตทั่วไป (home)', callback_data: 'vps_home' }]
        ]
      }
    };
    bot.sendMessage(chatId, '🔧 *เลือกประเภท VPS:*', options).then(sentMessage => {
      if (!userSessions[userId]) {
        userSessions[userId] = {};
      }
      userSessions[userId].chatId = chatId;
      userSessions[userId].originalMessageId = sentMessage.message_id;
    });
  } else {
    bot.sendMessage(chatId, '⚠️ *สามารถใช้คำสั่งนี้ได้เฉพาะในกลุ่มที่กำหนดเท่านั้น!*', { parse_mode: 'Markdown' });
  }
});

// จัดการ callback_query (เลือก VPS และโปรไฟล์)
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  if (!userSessions[userId]) {
    userSessions[userId] = {};
  }
  const session = userSessions[userId];

  if (data === 'vps_IDC' || data === 'vps_home') {
    session.vpsType = (data === 'vps_IDC') ? 'IDC' : 'home';
    const profileOptions = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 TRUEเฟสบุ๊คเกมมิ่ง&Esport', callback_data: 'profile_true_pro_facebook' }],
          [{ text: '📶 AIS', callback_data: 'profile_ais' }],
          [{ text: '🔧 TRUE Zoom&VDO', callback_data: 'profile_true_zoom' }]
        ]
      }
    };
    bot.editMessageText('🔍 *เลือกโปรไฟล์:*', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    }).then(() => {
      bot.sendMessage(chatId, '🔍 *กรุณาเลือกโปรไฟล์ที่ต้องการ:*', profileOptions).then(sentMessage => {
        session.originalMessageId = sentMessage.message_id;
      });
    }).catch((error) => {
      console.error('🚫 Error editing message:', error);
    });
  } else if (data === 'vps_IDC_trial' || data === 'vps_home_trial') {
    session.vpsType = (data === 'vps_IDC_trial') ? 'IDC' : 'home';
    session.isTrial = true;
    const profileOptions = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 TRUEเฟสบุ๊คเกมมิ่ง&Esport', callback_data: 'profile_true_pro_facebook_trial' }],
          [{ text: '📶 AIS', callback_data: 'profile_ais_trial' }],
          [{ text: '🔧 TRUE Zoom&VDO', callback_data: 'profile_true_zoom_trial' }]
        ]
      }
    };
    bot.editMessageText('🔍 *เลือกโปรไฟล์:*', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    }).then(() => {
      bot.sendMessage(chatId, '🔍 *กรุณาเลือกโปรไฟล์ที่ต้องการ:*', profileOptions).then(sentMessage => {
        session.originalMessageId = sentMessage.message_id;
      });
    }).catch((error) => {
      console.error('🚫 Error editing message:', error);
    });
  } else if (data.startsWith('profile_')) {
    let apiId;
    let profileType;
    const isTrial = data.endsWith('_trial');
    const dataNormal = data.replace('_trial', '');

    if (session.vpsType === 'IDC') {
      if (dataNormal === 'profile_true_pro_facebook') {
        apiId = 3;
        profileType = 'true_pro_facebook';
      } else if (dataNormal === 'profile_ais') {
        apiId = 1;
        profileType = 'ais';
      } else if (dataNormal === 'profile_true_zoom') {
        apiId = 2;
        profileType = 'true_zoom';
      }
    } else if (session.vpsType === 'home') {
      if (dataNormal === 'profile_true_pro_facebook') {
        apiId = 13;
        profileType = 'true_pro_facebook';
      } else if (dataNormal === 'profile_ais') {
        apiId = 11;
        profileType = 'ais';
      } else if (dataNormal === 'profile_true_zoom') {
        apiId = 12;
        profileType = 'true_zoom';
      }
    }

    session.step = 'ask_code_name';
    session.type = profileType;
    session.apiId = apiId;
    if (isTrial) {
      session.isTrial = true;
    }

    bot.editMessageText('📝 *กรุณาตั้งชื่อโค้ดของคุณ:*', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    }).catch((error) => {
      console.error('🚫 Error editing message:', error);
    });
  } else if (data === 'givecredits_to_user') {
    if (adminIds.includes(userId)) {
      userSessions[userId] = { step: 'givecredits_ask_user' };
      bot.sendMessage(chatId, '🔍 *กรุณาตอบกลับข้อความของผู้ใช้ที่ต้องการเพิ่มเครดิตให้*', { parse_mode: 'Markdown' });
    } else {
      bot.answerCallbackQuery(callbackQuery.id, '🚫 *คำสั่งนี้สำหรับแอดมินเท่านั้น!*', { show_alert: true, parse_mode: 'Markdown' });
    }
  } else if (data === 'givecredits_to_self') {
    if (adminIds.includes(userId)) {
      userSessions[userId] = { step: 'givecredits_ask_amount', targetUserId: userId };
      bot.sendMessage(chatId, '💰 *กรุณาระบุจำนวนเครดิตที่ต้องการเพิ่มให้ตัวเอง*', { parse_mode: 'Markdown' });
    } else {
      bot.answerCallbackQuery(callbackQuery.id, '🚫 *คำสั่งนี้สำหรับแอดมินเท่านั้น!*', { show_alert: true, parse_mode: 'Markdown' });
    }
  } else if (data === 'time_unit_day' || data === 'time_unit_hour' || data === 'time_unit_minute') {
    if (data === 'time_unit_day') {
      session.timeUnit = 'day';
    } else if (data === 'time_unit_hour') {
      session.timeUnit = 'hour';
    } else if (data === 'time_unit_minute') {
      session.timeUnit = 'minute';
    }

    session.step = 'ask_time_amount';

    bot.editMessageText(`⏰ *คุณเลือกหน่วยเวลา:* ${session.timeUnit === 'day' ? 'วัน' : session.timeUnit === 'hour' ? 'ชั่วโมง' : 'นาที'}`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    }).catch((error) => {
      console.error('🚫 Error editing message:', error);
    });

    bot.sendMessage(chatId, `📅 *กรุณาระบุจำนวน${session.timeUnit === 'day' ? 'วัน' : session.timeUnit === 'hour' ? 'ชั่วโมง' : 'นาที'}ที่ต้องการ:*`, { parse_mode: 'Markdown' }).then(sentMessage => {
      session.timeAmountMessageId = sentMessage.message_id;
    });
  } else if (data === 'refresh_topup_info') {
    const message = 
`💠💠💠💠💠💠💠💠💠
*⚡️ Hi-Tech Top-Up System ⚡️*
💠💠💠💠💠💠💠💠💠

✨ *ขั้นตอนการเติมเครดิต:*
1. 🔗 ส่ง *ลิงก์ซองอั่งเปาวอเล็ท* ให้บอท (ลิงก์รูปแบบ: https://gift.truemoney.com/campaign/?v=xxxxx)
2. ⏳ รอสักครู่ ระบบ AI ประมวลผลอย่างรวดเร็ว
3. 💎 รับเครดิตของคุณและพร้อมใช้งานทันที!

🎁 *โปรโมชั่นพิเศษ!*
💰 เติม 100 บาท รับฟรีอีก 20 เครดิต!

*Tip:* ยิ่งเติมมาก ยิ่งคุ้มมาก! 🚀
`;

    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    }).catch((error) => {
      console.error('🚫 Error refreshing topup info:', error);
    });
  } else if (data.startsWith('verify_slip:')) {
    const photoId = data.split(':')[1];
    verifyBankSlip(chatId, photoId);
  } else if (data === 'verify_tw_slip') {
    const photoId = session.photoId;
    if (photoId) {
      verifyTrueMoneyWalletSlip(chatId, photoId);
    } else {
      bot.sendMessage(chatId, '❌ *ไม่พบรูปภาพที่จะตรวจสอบ*', { parse_mode: 'Markdown' });
    }
  } else if (data === 'not_slip') {
    bot.sendMessage(chatId, '❌ *คุณยกเลิกการตรวจสอบสลิป*', { parse_mode: 'Markdown' });
  }
});

// จัดการข้อความจากผู้ใช้
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // ตรวจสอบว่ามีการส่งภาพมาหรือไม่ (อาจเป็นสลิปธนาคาร)
  if (msg.photo && msg.photo.length > 0) {
    // ใช้รูปที่มีความละเอียดสูงที่สุด
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    
    if (msg.chat.type === 'private') {
      // ถามว่าต้องการตรวจสอบสลิปหรือไม่
      const options = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ ใช่ นี่คือสลิปธนาคาร', callback_data: `verify_slip:${photoId}` }],
            [{ text: '✅ ใช่ นี่คือสลิปวอเล็ท TrueMoney', callback_data: 'verify_tw_slip' }],
            [{ text: '❌ ไม่ใช่ นี่เป็นเพียงรูปทั่วไป', callback_data: 'not_slip' }]
          ]
        }
      };
      userSessions[userId] = { photoId };
      bot.sendMessage(chatId, '🏦 *คุณส่งรูปภาพมา ภาพนี้เป็นสลิปการโอนเงินหรือไม่?*', options);
    }
    return;
  }

  // ตรวจสอบสมาชิกใหม่เข้ากลุ่ม
  if (msg.new_chat_members) {
    msg.new_chat_members.forEach((newMember) => {
      if (newMember.id !== bot.id) {
        const welcomeMessage = `🎉 *ยินดีต้อนรับคุณ ${newMember.first_name} สู่กลุ่มสุดไฮเทค!* 🎊\n\n` +
                               `🔧 คุณสามารถใช้คำสั่งต่อไปนี้เพื่อเริ่มต้น:\n` +
                               `🚀 /addclient - *สร้างโค้ดใหม่*\n` +
                               `💳 /topup - *เติมเงินเพื่อรับเครดิต*\n` +
                               `💰 /mycredits - *ตรวจสอบเครดิตของคุณ*\n` +
                               `📄 /mycodes - *ดูโค้ดที่คุณสร้างไว้*\n` +
                               `🆓 /trialcode - *ทดลองใช้โค้ดฟรี*\n` +
                               `🤝 /transfercredits - *โอนเครดิตให้ผู้ใช้อื่น*\n\n` +
                               `⚡️ เริ่มต้นด้วยการเติมเครดิตด้วยคำสั่ง /topup แล้วเริ่มใช้งานได้เลย!`;
        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
      }
    });
    return;
  }

  if (userSessions[userId]) {
    const session = userSessions[userId];

    // ขั้นตอนสร้างโค้ด
    if (session.step === 'ask_code_name') {
      session.codeName = text;

      if (session.isTrial) {
        // โค้ดทดลอง 20 นาที
        session.timeUnit = 'minute';
        session.timeAmount = 20;
        session.expiryTime = generateExpiryTime(session.timeAmount, session.timeUnit);
        session.step = 'ask_gb_limit';
        bot.sendMessage(chatId, '💾 *ระบุ GB จำกัด (0 = ไม่จำกัด):*', { parse_mode: 'Markdown' }).then(sentMessage => {
          session.gbMessageId = sentMessage.message_id;
        });
      } else {
        session.step = 'ask_time_unit';
        const options = {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📅 หน่วยวัน', callback_data: 'time_unit_day' }],
              [{ text: '⏰ หน่วยชั่วโมง', callback_data: 'time_unit_hour' }],
              [{ text: '⏱️ หน่วยนาที', callback_data: 'time_unit_minute' }]
            ]
          }
        };
        bot.sendMessage(chatId, '⏰ *เลือกหน่วยเวลา:*', options).then(sentMessage => {
          session.timeUnitMessageId = sentMessage.message_id;
        });
      }
    } else if (session.step === 'ask_time_unit') {
      // จะเกิดใน callback_query เท่านั้นจึงไม่ต้องทำอะไรที่นี่
    } else if (session.step === 'ask_time_amount') {
      const timeAmount = parseInt(text);
      if (isNaN(timeAmount) || timeAmount <= 0) {
        bot.sendMessage(chatId, '⚠️ *กรุณาระบุจำนวนที่ถูกต้อง!*', { parse_mode: 'Markdown' });
      } else {
        session.timeAmount = timeAmount;
        session.expiryTime = generateExpiryTime(session.timeAmount, session.timeUnit);
        session.step = 'ask_gb_limit';
        bot.sendMessage(chatId, '💾 *ระบุ GB จำกัด (0 = ไม่จำกัด):*', { parse_mode: 'Markdown' }).then(sentMessage => {
          session.gbMessageId = sentMessage.message_id;
        });
      }
    } else if (session.step === 'ask_gb_limit') {
      const gbLimit = parseInt(text);
      if (isNaN(gbLimit) || gbLimit < 0) {
        bot.sendMessage(chatId, '⚠️ *กรุณาระบุ GB ที่ถูกต้อง!*', { parse_mode: 'Markdown' });
      } else {
        session.gbLimit = gbLimit;
        session.step = 'ask_ip_limit'; // เปลี่ยนขั้นตอนเป็นการถามจำนวน IP

        bot.sendMessage(chatId, '🌐 *กรุณาระบุจำนวน IP ที่ต้องการ:*', { parse_mode: 'Markdown' }).then(sentMessage => {
          session.ipMessageId = sentMessage.message_id;
        });
      }
    } else if (session.step === 'ask_ip_limit') {
      const ipLimit = parseInt(text);
      if (isNaN(ipLimit) || ipLimit <= 0) {
        bot.sendMessage(chatId, '⚠️ *กรุณาระบุจำนวน IP ที่ถูกต้อง!*', { parse_mode: 'Markdown' });
      } else {
        session.ipLimit = ipLimit;
        session.step = 'creating_code';

        bot.sendAnimation(chatId, 'https://i.imgur.com/CiAYAcN.gif', {
          caption: '🔄 *กำลังสร้างโค้ด... โปรดรอซักครู่...*',
          parse_mode: 'Markdown'
        }).then((loadingMessage) => {
          session.loadingMessageId = loadingMessage.message_id;

          setTimeout(() => {
            const userIdStr = userId.toString();
            let userData = getUserData(userIdStr);

            if (session.isTrial) {
              if (userData.trialCodesCount >= 3) {
                bot.sendMessage(chatId, '🚫 *ใช้โค้ดทดลองครบแล้วในเดือนนี้!*', { parse_mode: 'Markdown' });
                if (session.loadingMessageId) {
                  bot.deleteMessage(chatId, session.loadingMessageId).catch(console.error);
                }
                delete userSessions[userId];
                return;
              } else {
                login(session.vpsType, (loginError) => {
                  if (loginError) {
                    bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการเข้าสู่ระบบ!*', { parse_mode: 'Markdown' });
                    if (session.loadingMessageId) {
                      bot.deleteMessage(chatId, session.loadingMessageId).catch(console.error);
                    }
                    delete userSessions[userId];
                    return;
                  }

                  addNewClient(session, (clientCode, expiryTime) => {
                    sendCodeToUser(userId, chatId, clientCode, session, msg, expiryTime);
                    userData.trialCodesCount = (userData.trialCodesCount || 0) + 1;
                    saveUserData(userIdStr, userData);

                    if (session.loadingMessageId) {
                      bot.deleteMessage(chatId, session.loadingMessageId).catch(console.error);
                    }

                    bot.sendMessage(chatId, '✅ *โค้ดถูกส่งไปยังแชทส่วนตัวแล้ว!*', { parse_mode: 'Markdown' });
                    delete userSessions[userId];
                  }, (errorMsg) => {
                    bot.sendMessage(chatId, `🚫 *เกิดข้อผิดพลาด:* ${errorMsg}`, { parse_mode: 'Markdown' });
                    if (session.loadingMessageId) {
                      bot.deleteMessage(chatId, session.loadingMessageId).catch(console.error);
                    }
                    delete userSessions[userId];
                  });
                });
              }
            } else {
              login(session.vpsType, (loginError) => {
                if (loginError) {
                  bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาดในการเข้าสู่ระบบ!*', { parse_mode: 'Markdown' });
                  if (session.loadingMessageId) {
                    bot.deleteMessage(chatId, session.loadingMessageId).catch(console.error);
                  }
                  delete userSessions[userId];
                  return;
                }

                let userData = getUserData(userId.toString());
                let currentCredits = userData.credits || 0;

                let requiredCredits;
                if (session.timeUnit === 'day') {
                  requiredCredits = session.timeAmount * 2;
                } else if (session.timeUnit === 'hour') {
                  requiredCredits = session.timeAmount * 5.4;
                } else if (session.timeUnit === 'minute') {
                  requiredCredits = session.timeAmount * 0.1;
                }

                // เพิ่มเครดิตตามจำนวน IP
                if (session.ipLimit && session.ipLimit > 0) {
                  requiredCredits += session.ipLimit * 1; // ตัวอย่าง: 1 เครดิตต่อ IP
                }

                requiredCredits = parseFloat(requiredCredits.toFixed(2));

                if (currentCredits < requiredCredits) {
                  bot.sendMessage(chatId, `⚠️ *เครดิตไม่พอ!* คุณมี ${currentCredits} ต้องการ ${requiredCredits} เครดิต\nกรุณาเติมด้วย /topup`, { parse_mode: 'Markdown' });
                  if (session.loadingMessageId) {
                    bot.deleteMessage(chatId, session.loadingMessageId).catch(console.error);
                  }
                  delete userSessions[userId];
                  return;
                }

                addNewClient(session, (clientCode, expiryTime) => {
                  sendCodeToUser(userId, chatId, clientCode, session, msg, expiryTime);

                  if (session.loadingMessageId) {
                    bot.deleteMessage(chatId, session.loadingMessageId).catch(console.error);
                  }

                  bot.sendMessage(chatId, '✅ *โค้ดถูกส่งไปยังแชทส่วนตัวแล้ว!*', { parse_mode: 'Markdown' });
                  delete userSessions[userId];
                }, (errorMsg) => {
                  bot.sendMessage(chatId, `🚫 *เกิดข้อผิดพลาด:* ${errorMsg}`, { parse_mode: 'Markdown' });
                  if (session.loadingMessageId) {
                    bot.deleteMessage(chatId, session.loadingMessageId).catch(console.error);
                  }
                  delete userSessions[userId];
                });
              });
            }
          }, 4000);
        }).catch((error) => {
          console.error('🚫 Error sending loading animation:', error);
          bot.sendMessage(chatId, '🚫 *เกิดข้อผิดพลาด ลองใหม่อีกครั้ง*', { parse_mode: 'Markdown' });
          delete userSessions[userId];
        });
      }
    } else if (session.step === 'transfer_ask_user') {
      // ผู้ใช้ต้องตอบกลับข้อความของผู้ใช้เป้าหมาย
      if (!msg.reply_to_message) {
        // ถ้าไม่ได้ตอบกลับข้อความ ให้ยกเลิกการโอนทันที
        bot.sendMessage(chatId, '❌ *การโอนเครดิตถูกยกเลิก เนื่องจากไม่ได้ตอบกลับข้อความของผู้รับ*', { parse_mode: 'Markdown' });
        delete userSessions[userId];
        return;
      }
      
      const targetUserId = msg.reply_to_message.from.id;
      if (targetUserId) {
        session.targetUserId = targetUserId;
        session.step = 'transfer_ask_amount';
        const message = `💰 *กรุณาระบุจำนวนเครดิตที่ต้องการโอนให้กับผู้ใช้ ID: ${targetUserId}*`;
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, '❌ *การโอนเครดิตถูกยกเลิก เนื่องจากไม่พบผู้รับ*', { parse_mode: 'Markdown' });
        delete userSessions[userId];
      }
    } else if (session.step === 'transfer_ask_amount') {
      const amount = parseInt(text);
      if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, '⚠️ *กรุณาระบุจำนวนเครดิตที่ถูกต้อง!*', { parse_mode: 'Markdown' });
      } else {
        const targetUserId = session.targetUserId.toString();
        const senderUserId = userId.toString();

        let senderData = getUserData(senderUserId);
        let receiverData = getUserData(targetUserId);

        if ((senderData.credits || 0) < amount) {
          bot.sendMessage(chatId, '🚫 *เครดิตไม่เพียงพอสำหรับการโอน!*', { parse_mode: 'Markdown' });
          delete userSessions[userId];
          return;
        }

        senderData.credits -= amount;
        receiverData.credits += amount;
        saveUserData(senderUserId, senderData);
        saveUserData(targetUserId, receiverData);

        bot.sendMessage(chatId, `✅ *โอนเครดิต ${amount} เครดิต ไปยังผู้ใช้ ${targetUserId} สำเร็จ!*`, { parse_mode: 'Markdown' });

        bot.sendMessage(targetUserId, `💎 *คุณได้รับเครดิต ${amount} เครดิต จากผู้ใช้ ${senderUserId}!*`, { parse_mode: 'Markdown' })
          .catch((err) => {
            console.error('🚫 Error notifying receiver:', err);
          });

        delete userSessions[userId];
      }
    } else if (session.step === 'givecredits_ask_user') {
      if (msg.reply_to_message && msg.reply_to_message.from) {
        const targetUserId = msg.reply_to_message.from.id;
        session.targetUserId = targetUserId;
        session.step = 'givecredits_ask_amount';
        bot.sendMessage(chatId, '💰 *กรุณาระบุจำนวนเครดิตที่ต้องการเพิ่มให้ผู้ใช้คนนี้*', { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, '⚠️ *กรุณาตอบกลับข้อความของผู้ใช้ที่ต้องการเพิ่มเครดิต!*', { parse_mode: 'Markdown' });
      }
    } else if (session.step === 'givecredits_ask_amount') {
      const amount = parseInt(text);
      if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, '⚠️ *กรุณาระบุจำนวนเครดิตที่ถูกต้อง!*', { parse_mode: 'Markdown' });
      } else {
        const targetUserId = session.targetUserId.toString();
        let targetUserData = getUserData(targetUserId);
        let currentCredits = targetUserData.credits || 0;
        targetUserData.credits = currentCredits + amount;
        saveUserData(targetUserId, targetUserData);

        bot.sendMessage(chatId, `✅ *เพิ่มเครดิตให้ผู้ใช้ ${targetUserId} จำนวน ${amount} เครดิตแล้ว!*`, { parse_mode: 'Markdown' });

        if (targetUserId !== userId.toString()) {
          bot.sendMessage(targetUserId, `💎 *คุณได้รับเครดิตเพิ่ม ${amount} เครดิต จากแอดมิน!*`, { parse_mode: 'Markdown' });
        }
        delete userSessions[userId];
      }
    }
  } else if (msg.chat.type === 'private') {
    // จัดการข้อความในแชทส่วนตัวกรณีส่งลิงก์ซองอั่งเปา
    if (text && text.startsWith('/start')) {
      const args = text.split(' ');
      if (args.length > 1 && args[1] === 'topup') {
        const chatId = msg.chat.id;
        const message =
`💠💠💠💠💠💠💠💠💠
*⚡️ Hi-Tech Top-Up System ⚡️*
💠💠💠💠💠💠💠💠💠

✨ *ขั้นตอนการเติมเครดิต:*
1. 🔗 ส่ง *ลิงก์ซองอั่งเปาวอเล็ท* ให้บอท (ลิงก์รูปแบบ: https://gift.truemoney.com/campaign/?v=xxxxx)
2. ⏳ รอสักครู่ ระบบ AI ประมวลผลอย่างรวดเร็ว
3. 💎 รับเครดิตของคุณและพร้อมใช้งานทันที!

🎁 *โปรโมชั่นพิเศษ!*
💰 เติม 100 บาท รับฟรีอีก 20 เครดิต!

🚀 ยิ่งเติมมาก ยิ่งได้รับมาก!`;

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      }
    }

    if (text && text.includes('https://gift.truemoney.com/campaign/?v=')) {
      const codeMatch = text.match(/v=([a-zA-Z0-9]+)/);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1];
        processTrueMoneyGiftCode(chatId, code);
      } else {
        bot.sendMessage(chatId, '⚠️ *ลิงก์ไม่ถูกต้อง!*', { parse_mode: 'Markdown' });
      }
    }
  } else {
    // ไม่ตอบสนองต่อข้อความอื่นๆ ในกลุ่ม หากไม่ใช่คำสั่ง
    if (text && !text.startsWith('/')) {
      bot.sendMessage(chatId, '❓ *ไม่เข้าใจคำสั่งของคุณ โปรดใช้คำสั่งที่กำหนด!*', { parse_mode: 'Markdown' })
        .then((sentMessage) => {
          setTimeout(() => {
            bot.deleteMessage(chatId, sentMessage.message_id).catch(console.error);
          }, 6000);
        });
    }
  }
});

// 📬 ฟังก์ชันสำหรับส่งโค้ดไปยังผู้ใช้
function sendCodeToUser(userId, chatId, clientCode, session, msg, expiryTime) {
  const actualExpiryTime = expiryTime || generateExpiryTime(session.timeAmount, session.timeUnit);
  bot.sendMessage(userId, `🎉 *โค้ดของคุณถูกสร้างสำเร็จ!* ✅\n\n📬 *โค้ดของคุณ:*\n\n\`${clientCode}\`\n\n⏳ *หมดอายุใน ${session.timeAmount} ${session.timeUnit === 'day' ? 'วัน' : session.timeUnit === 'hour' ? 'ชั่วโมง' : 'นาที'}*\n📊 *จำนวน IP ที่อนุญาต:* ${session.ipLimit}\n\n💎 *ขอบคุณที่ใช้บริการ!*`, { parse_mode: 'Markdown' })
    .then(() => {
      const userIdStr = userId.toString();
      let userData = getUserData(userIdStr);
      if (!userData.codes) {
        userData.codes = [];
      }
      userData.codes.push({
        code: clientCode,
        codeName: session.codeName,
        creationDate: new Date().toLocaleString(),
        expiryTime: actualExpiryTime,
        ipLimit: session.ipLimit // บันทึกจำนวน IP
      });
      saveUserData(userIdStr, userData);

      if (!session.isTrial) {
        let requiredCredits;
        if (session.timeUnit === 'day') {
          requiredCredits = session.timeAmount * 2;
        } else if (session.timeUnit === 'hour') {
          requiredCredits = session.timeAmount * 5.4;
        } else if (session.timeUnit === 'minute') {
          requiredCredits = session.timeAmount * 0.1;
        }
        // เพิ่มเครดิตตามจำนวน IP
        if (session.ipLimit && session.ipLimit > 0) {
          requiredCredits += session.ipLimit * 1; // ตัวอย่าง: 1 เครดิตต่อ IP
        }
        requiredCredits = parseFloat(requiredCredits.toFixed(2));

        let currentCredits = userData.credits || 0;

        if (currentCredits >= requiredCredits) {
          userData.credits = currentCredits - requiredCredits;
          saveUserData(userIdStr, userData);
          bot.sendMessage(chatId, `💰 *หักเครดิต ${requiredCredits} เครดิตจากยอดเครดิตของคุณเรียบร้อย!*`, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, `⚠️ *เครดิตไม่พอสำหรับการหักเครดิต (${requiredCredits} เครดิต). กรุณาเติมเครดิตเพิ่มเติม*`, { parse_mode: 'Markdown' });
        }
      } else {
        bot.sendMessage(chatId, `💎 *โค้ดทดลองใช้งานได้ 20 นาที!*`, { parse_mode: 'Markdown' });
      }

      delete userSessions[userId];
    })
    .catch((error) => {
      if (error.response && error.response.statusCode === 403) {
        const options = {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 เริ่มแชทกับบอท', url: `https://t.me/${botUsername}?start` }]
            ]
          }
        };
        const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
        bot.sendMessage(chatId, `${username} *กรุณาเริ่มแชทส่วนตัวกับบอทก่อนเพื่อรับโค้ด*`, options);
      } else {
        console.error('🚫 Error sending code to user:', error);
      }
    });
}

// 🗑️ ฟังก์ชันสำหรับลบโค้ดที่หมดอายุ และรีเซ็ต trialCodesCount ทุกเดือน
function removeExpiredCodes() {
  const now = Date.now();
  const currentMonth = new Date().getMonth();

  for (let userId in usersData) {
    if (usersData[userId].codes && usersData[userId].codes.length > 0) {
      usersData[userId].codes = usersData[userId].codes.filter(codeEntry => {
        if (codeEntry.expiryTime) {
          return codeEntry.expiryTime > now;
        }
        return true;
      });
    }

    if (usersData[userId].lastTrialResetMonth !== currentMonth) {
      usersData[userId].trialCodesCount = 0;
      usersData[userId].lastTrialResetMonth = currentMonth;
    }
  }

  fs.writeFile(dataFilePath, JSON.stringify(usersData, null, 2), (err) => {
    if (err) {
      console.error(`🚫 Error writing ${dataFilePath}:`, err);
    }
  });
}

// ⏱️ เรียกใช้งานฟังก์ชัน removeExpiredCodes ทุกๆ 24 ชั่วโมง
setInterval(removeExpiredCodes, 24 * 60 * 60 * 1000);
