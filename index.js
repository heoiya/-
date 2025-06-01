// 📦 นำเข้าโมดูลที่จำเป็น
const TelegramBot = require('node-telegram-bot-api');
const request = require('request').defaults({ jar: true });
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// 🔑 ใส่โทเคนบอท Telegram ของคุณที่นี่
const token = '7958883201:AAFvcPy2OTdqMuNeSRXduImHIMIaZpU5sEg'; // แทนที่ด้วยโทเคนของคุณ

// 🤖 สร้างบอทที่ใช้ 'polling' ในการรับข้อความใหม่
const bot = new TelegramBot(token, { polling: true });

// 🗂️ เก็บสถานะของผู้ใช้ในการสนทนา
const userSessions = {};

// 🗂️ เก็บข้อมูลผู้ใช้ใหม่และการตรวจสอบสแปม
const newUserActivity = {};

// 📲 เบอร์มือถือที่ใช้ในการรับเงิน TrueMoney
const mobileNumber = '0825658423'; // เปลี่ยนเป็นเบอร์ของคุณ

// 🤖 เก็บชื่อผู้ใช้ของบอท
let botUsername = '';
bot.getMe().then((botInfo) => {
  botUsername = botInfo.username;
  console.log(`✅ Bot username: @${botUsername}`);
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

// 🔐 ฟังก์ชันสำหรับเข้าสู่ระบบ
function login(callback) {
  const loginOptions = {
    method: 'POST',
    url: 'https://tha1.thatoeyvpn.online:1111/vpn/login',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {
      'username': 'zazacvcv02',
      'password': 'zazacvcv02'
    }
  };

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

// 👥 ฟังก์ชันสำหรับเพิ่มลูกค้าใหม่
function addNewClient(session, successCallback, errorCallback) {
  const clientUUID = generateUUID();
  const expiryTime = session.expiryTime || generateExpiryTime(session.timeAmount, session.timeUnit);
  const totalGB = session.gbLimit > 0 ? session.gbLimit * 1024 * 1024 * 1024 : 0;
  const ipLimit = session.ipLimit > 0 ? session.ipLimit : 0;

  const apiUrl = 'https://tha1.thatoeyvpn.online:1111/vpn/panel/api/inbounds/addClient';
  const apiSettings = {
    clients: [{
      id: clientUUID,
      alterId: 0,
      email: session.codeName,
      limitIp: ipLimit || 2,
      totalGB: totalGB > 0 ? totalGB : 0,
      expiryTime: expiryTime,
      enable: true,
      tgId: '',
      subId: ''
    }]
  };

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
        if (session.type === 'true_pro_facebook') {
          clientCode = `vless://${clientUUID}@tha1.thatoeyvpn.online:8000?type=tcp&security=tls&fp=chrome&alpn=h3%2Ch2%2Chttp%2F1.1&allowInsecure=1&sni=connect.facebook.net#${encodeURIComponent(session.codeName)}`;
        } else if (session.type === 'ais') {
          clientCode = `vless://${clientUUID}@tha1.thatoeyvpn.online:8080?type=ws&path=%2Fvpnws&host=speedtest.net&security=none#${encodeURIComponent(session.codeName)}`;
        } else if (session.type === 'true_zoom') {
          clientCode = `vless://${clientUUID}@support.zoom.us:8443?type=ws&path=%2F&host=tha1.thatoeyvpn.online&security=tls&fp=chrome&alpn=h3%2Ch2%2Chttp%2F1.1&sni=tha1.thatoeyvpn.online#${encodeURIComponent(session.codeName)}`;
        }
        successCallback(clientCode, expiryTime);
      } else {
        console.log('🚫 การเพิ่มลูกค้าล้มเหลว:', body.msg);
        if (body.msg.includes('Duplicate email')) {
          errorCallback('มีชื่อนี้ในระบบแล้ว');
        } else {
          errorCallback(body.msg);
        }
      }
    } catch (e) {
      console.error('🚫 ไม่สามารถแปลงข้อมูลการตอบกลับเป็น JSON ได้:', e);
      console.log('📥 Response Body:', response.body);
      errorCallback('ไม่สามารถแปลงข้อมูลการตอบกลับเป็น JSON ได้');
    }
  });
}

// 💸 ฟังก์ชันสำหรับจัดการลิงก์ซองอั่งเปา TrueMoney
function verifyPaymentLinkangpao(chatId, parameters, paymentData, amount) {
  console.log(`amount: ${amount}`);
  console.log(`parameters: ${JSON.stringify(parameters)}`);
  console.log(`paymentData: ${paymentData}`);

  if (!paymentData || typeof paymentData !== 'string') {
    bot.sendMessage(chatId, '🚫 *ข้อมูลการชำระเงินไม่ถูกต้อง*', { parse_mode: 'Markdown' });
    return;
  }

  // แก้ไข pattern ให้รองรับทั้งแบบมีและไม่มี / หลัง campaign
  const linkPattern = /https:\/\/gift\.truemoney\.com\/campaign\/?(\?v=)([0-9A-Za-z]{35})/;
  const match = paymentData.match(linkPattern);
  if (!match) {
    bot.sendMessage(chatId, '🚫 *ลิงก์ซองอั่งเปาไม่ถูกต้อง*', { parse_mode: 'Markdown' });
    return;
  }

  // ใช้ match[2] เพราะตอนนี้กลุ่มที่ 2 คือ voucher hash (เนื่องจากเราเพิ่มกลุ่มที่ 1 สำหรับ ?v=)
  const voucherHash = match[2];
  console.log(`voucherHash: ${voucherHash}`);

  const postData = JSON.stringify({
    mobile: parameters.phone,
    voucher_hash: voucherHash
  });

  const url = `https://gift.truemoney.com/campaign/vouchers/${voucherHash}/redeem`;

  // สร้าง User-Agent แบบสุ่มเพื่อให้เหมือนเบราว์เซอร์จริง
  const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.${Math.floor(Math.random() * 9000) + 1000}.0 Safari/537.36`;

  const options = {
    method: 'POST',
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': userAgent,
      'Origin': 'https://gift.truemoney.com',
      'Referer': 'https://gift.truemoney.com/campaign/',
      'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Content-Length': Buffer.byteLength(postData)
    },
    body: postData,
    gzip: true
  };

  request(options, (error, response, body) => {
    if (error) {
      console.error('[verifyPaymentLinkangpao] cURL error:', error);
      bot.sendMessage(chatId, '🚫 *ไม่สามารถยืนยันการชำระเงินได้ เกิดข้อผิดพลาดในการเชื่อมต่อ*', { parse_mode: 'Markdown' });
      return;
    }

    console.log(`[verifyPaymentLinkangpao] API response status: ${response.statusCode}`);
    console.log(`[verifyPaymentLinkangpao] API response body: ${body}`);

    let data;
    try {
      if (!body || typeof body !== 'string' || (!body.trim().startsWith('{') && !body.trim().startsWith('['))) {
        throw new Error('Response is not valid JSON');
      }
      data = JSON.parse(body);
    } catch (e) {
      console.error('[verifyPaymentLinkangpao] JSON decode error:', e);
      bot.sendMessage(chatId, '🚫 *ลิงก์นี้ถูกใช้ไปแล้วหรือหมดอายุ หรือไม่สามารถใช้งานได้ กรุณาตรวจสอบลิงก์ซองอั่งเปาใหม่อีกครั้ง*', { parse_mode: 'Markdown' });
      return;
    }

    if (data.status && data.status.code === 'SUCCESS') {
      const voucherAmount = parseFloat(data.data.my_ticket.amount_baht);
      console.log(`[verifyPaymentLinkangpao] Voucher amount: ${voucherAmount}, Expected amount: ${amount}`);
      if (voucherAmount === amount) {
        let creditsToAdd = amount;
        if (amount === 100) {
          creditsToAdd += 20; // เติม 100 บาท รับเพิ่มอีก 20 เครดิต
        }
        bot.sendMessage(chatId, `🎉 *รับเงินจำนวน ${amount} บาท เรียบร้อยแล้ว!* คุณได้รับ ${creditsToAdd} เครดิต ขอบคุณที่สนับสนุนเราครับ 🙏`, { parse_mode: 'Markdown' });
        updateUserCredits(chatId, creditsToAdd);
      } else {
        bot.sendMessage(chatId, `🚫 *จำนวนเงินในซอง (${voucherAmount} บาท) ไม่ตรงกับจำนวนเงินที่ระบุ (${amount} บาท)*`, { parse_mode: 'Markdown' });
      }
    } else {
      const errorMessage = data.status ? data.status.message : 'Unknown error';
      console.error(`[verifyPaymentLinkangpao] API error: ${errorMessage}`);
      bot.sendMessage(chatId, `🚫 *ไม่สามารถยืนยันการชำระเงินได้: ${errorMessage}*`, { parse_mode: 'Markdown' });
    }
  });
}

// 💰 ฟังก์ชันสำหรับอัปเดตเครดิตของผู้ใช้
let usersData = {};
const dataFilePath = path.join(__dirname, 'transactions.json');

if (fs.existsSync(dataFilePath)) {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    usersData = JSON.parse(data);
    for (let userId in usersData) {
      usersData[userId].codes.forEach(codeEntry => {
        if (!codeEntry.expiryTime) {
          const creationDate = new Date(codeEntry.creationDate);
          const expiryDate = new Date(creationDate);
          expiryDate.setDate(creationDate.getDate() + 30);
          codeEntry.expiryTime = expiryDate.getTime();
        }
      });
      fs.writeFileSync(dataFilePath, JSON.stringify(usersData, null, 2));
    }
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
  bot.sendMessage(chatId, `💎 ยอดเครดิตปัจจุบันของคุณคือ ${newCredits} เครดิต`, { parse_mode: 'Markdown' });
}

// 👑 รายการแอดมิน
const adminIds = [7388463166];

// เก็บสถานะ mute ชั่วคราวของผู้ใช้
const mutedUsers = {};

// 🏁 รับคำสั่ง /start
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

// 💳 รับคำสั่ง /topup
bot.onText(/\/topup/, (msg) => {
  const chatId = msg.chat.id;
  if (msg.chat.type === 'private') {
    const message = 
`💠💠💠💠💠💠💠💠💠
*⚡️ Hi-Tech Top-Up System ⚡️*
💠💠💠💠💠💠💠💠💠

✨ *ขั้นตอนการเติมเครดิต:*
1. 🔗 ส่ง *ลิงก์ซองอั่งเปาวอเล็ท* ให้บอท
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

// 🆓 รับคำสั่ง /trialcode
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
    if (msg.chat.type === 'supergroup' && chatId === -1002415342873) {
      const options = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 สำหรับเกม VPS (IDC)', callback_data: 'vps_IDC_trial' }]
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

// 🤝 รับคำสั่ง /transfercredits
bot.onText(/\/transfercredits/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!userSessions[userId]) {
    userSessions[userId] = {};
  }
  userSessions[userId].step = 'transfer_ask_user';
  const message = `🤝 *ระบบโอนเครดิตสุดไฮเทค!*\n\n1. โปรด *ตอบกลับ (Reply)* ข้อความของผู้ใช้ที่คุณต้องการโอนเครดิตให้\n2. หลังจากนั้นบอทจะถามจำนวนเครดิตที่ต้องการโอน\n\n💎 สะดวก รวดเร็ว และปลอดภัย!`;
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

// 👑 รับคำสั่ง /allcodes สำหรับแอดมิน
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

// 🚀 รับคำสั่ง /addclient
bot.onText(/\/addclient/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (chatId === -1002415342873) {
    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 สำหรับเกม VPS (IDC)', callback_data: 'vps_IDC' }]
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

// จัดการ callback_query
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  if (!userSessions[userId]) {
    userSessions[userId] = {};
  }
  const session = userSessions[userId];

  if (data === 'vps_IDC') {
    session.vpsType = 'IDC';
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
  } else if (data === 'vps_IDC_trial') {
    session.vpsType = 'IDC';
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
1. 🔗 ส่ง *ลิงก์ซองอั่งเปาวอเล็ท* ให้บอท
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
  }
});

// จัดการข้อความจากผู้ใช้และตรวจสอบผู้ใช้ใหม่
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  const groupChatId = -1002415342873; // ID กลุ่มที่ต้องการตรวจสอบ

  // เช็ค pendingCode ในแชทส่วนตัว ก่อน logic อื่น
  if (msg.chat.type === 'private') {
    if (userSessions[userId] && userSessions[userId].pendingCode) {
      const { clientCode, session, msg: oldMsg, expiryTime } = userSessions[userId].pendingCode;
      sendCodeToUser(userId, userId, clientCode, session, oldMsg || msg, expiryTime);
      delete userSessions[userId].pendingCode;
      return;
    }
    
    // เพิ่มการตรวจจับลิงก์อั่งเปาในแชทส่วนตัว
    if (text && typeof text === 'string') {
      // แก้ไข pattern ให้รองรับทั้งแบบมีและไม่มี / หลัง campaign
      const linkPattern = /https:\/\/gift\.truemoney\.com\/campaign\/?(\?v=)([0-9A-Za-z]{35})/;
      if (linkPattern.test(text)) {
        // ตรวจพบลิงก์อั่งเปา
        bot.sendMessage(chatId, '🔍 *กำลังตรวจสอบลิงก์อั่งเปา...*', { parse_mode: 'Markdown' });
        
        // กำหนดจำนวนเงินจากลิงก์ (ในกรณีนี้เราจะใช้ค่าเริ่มต้นเป็น 100 บาท)
        // คุณอาจจะเพิ่มการถามผู้ใช้ว่าเป็นจำนวนเงินเท่าไหร่ หรือใช้ค่าเริ่มต้น
        const amount = 100;
        
        // เรียกใช้ฟังก์ชันตรวจสอบลิงก์อั่งเปา
        verifyPaymentLinkangpao(chatId, { phone: mobileNumber }, text, amount);
        return;
      }
    }
  }

  // จัดการเมื่อมีสมาชิกใหม่เข้ามาในกลุ่ม
  if (msg.new_chat_members && msg.chat.id === groupChatId) {
    console.log(`📥 New members detected in group ${groupChatId}:`, msg.new_chat_members);
    try {
      if (!Array.isArray(msg.new_chat_members)) {
        console.error('🚫 msg.new_chat_members is not an array:', msg.new_chat_members);
        return;
      }

      msg.new_chat_members.forEach((newMember) => {
        if (newMember.id !== bot.id && !adminIds.includes(newMember.id)) {
          console.log(`👤 New member: ${newMember.id} (${newMember.first_name}) joined the group`);
          const welcomeMessage = `🎉 *ยินดีต้อนรับคุณ ${newMember.first_name || 'ผู้ใช้ใหม่'} สู่กลุ่มสุดไฮเทค!* 🎊\n\n` +
                                `🔧 คุณสามารถใช้คำสั่งต่อไปนี้เพื่อเริ่มต้น:\n` +
                                `🚀 /addclient - *สร้างโค้ดใหม่*\n` +
                                `💳 /topup - *เติมเงินเพื่อรับเครดิต*\n` +
                                `💰 /mycredits - *ตรวจสอบเครดิตของคุณ*\n` +
                                `📄 /mycodes - *ดูโค้ดที่คุณสร้างไว้*\n` +
                                `🆓 /trialcode - *ทดลองใช้โค้ดฟรี*\n` +
                                `🤝 /transfercredits - *โอนเครดิตให้ผู้ใช้อื่น*\n\n` +
                                `⚠️ *โปรดใช้คำสั่งหรือส่งข้อความภายใน 10 นาที มิฉะนั้นคุณจะถูกเตะออกจากกลุ่ม!*`;
          
          // ส่งข้อความยินดีต้อนรับพร้อมหน่วงเวลาเล็กน้อยเพื่อให้ API เสถียร
          setTimeout(() => {
            bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' })
              .then(sentMessage => {
                console.log(`✅ Welcome message sent to ${newMember.id} (${newMember.first_name})`);
                // บันทึกข้อมูลผู้ใช้ใหม่
                newUserActivity[newMember.id] = {
                  joinTime: Date.now(),
                  lastActivity: Date.now(),
                  messageCount: 0,
                  messages: [],
                  isActive: false,
                  warningSent: false,
                  isBanned: false // เพิ่มสถานะ isBanned
                };
                console.log(`📋 Added ${newMember.id} to newUserActivity`);
              })
              .catch(err => {
                console.error(`🚫 Error sending welcome message to ${newMember.id}:`, err);
              });
          }, 1000); // หน่วงเวลา 1 วินาที

          // ระบบเชิญเพื่อน: ให้เครดิตกับผู้เชิญ (msg.from)
          if (msg.from && msg.from.id !== newMember.id && !adminIds.includes(msg.from.id) && !msg.from.is_bot) {
            const inviterId = msg.from.id.toString();
            let inviterData = getUserData(inviterId);
            inviterData.credits = (inviterData.credits || 0) + 1;
            saveUserData(inviterId, inviterData);
            console.log(`🎁 Credited 1 credit to inviter ${inviterId} for inviting ${newMember.id}`);
            bot.sendMessage(msg.from.id, `🎁 คุณได้รับ 1 เครดิตจากการเชิญเพื่อน (${newMember.first_name || 'ผู้ใช้ใหม่'}) เข้ากลุ่ม!`)
              .catch(err => {
                console.error(`🚫 Error sending invite credit message to ${inviterId}:`, err);
              });
          }
        }
      });
    } catch (err) {
      console.error('🚫 Error handling new_chat_members:', err);
    }
    return;
  }

  // อัปเดตกิจกรรมของผู้ใช้เมื่อมีการส่งข้อความ
  if (newUserActivity[userId] && msg.chat.id === groupChatId && !adminIds.includes(userId)) {
    newUserActivity[userId].lastActivity = Date.now();
    newUserActivity[userId].messageCount += 1;
    newUserActivity[userId].messages.push({
      text: text || '',
      timestamp: Date.now()
    });
    // ถือว่าผู้ใช้ active ถ้าใช้คำสั่งหรือส่งข้อความที่ไม่ใช่สแปม
    if (text && (text.startsWith('/') || text.length > 5)) {
      newUserActivity[userId].isActive = true;
    }
  }

  // ลบข้อความที่มีลิงก์ทันทีในกลุ่ม (เฉพาะ groupChatId) และ mute 2 นาที
  if (msg.chat.id === groupChatId && text && /https?:\/\//i.test(text)) {
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    // mute ผู้ใช้ 2 นาที
    if (!mutedUsers[userId]) {
      mutedUsers[userId] = true;
      bot.restrictChatMember(chatId, userId, {
        permissions: {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false
        },
        until_date: Math.floor(Date.now() / 1000) + 120 // 2 นาที
      }).then(() => {
        bot.sendMessage(chatId, `🚫 ผู้ใช้ @${msg.from.username || msg.from.first_name} ถูกแบนไม่ให้พิมพ์ 2 นาที เนื่องจากส่งลิงก์!`).then((banMsg) => {
          // เก็บ message_id ของข้อความแบนไว้สำหรับลบทีหลัง
          mutedUsers[userId] = { active: true, banMsgId: banMsg.message_id };
          setTimeout(() => {
            bot.restrictChatMember(chatId, userId, {
              permissions: {
                can_send_messages: true,
                can_send_media_messages: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true,
                can_change_info: false,
                can_invite_users: true,
                can_pin_messages: false
              }
            }).then(() => {
              // ลบข้อความแบนออก
              if (mutedUsers[userId] && mutedUsers[userId].banMsgId) {
                bot.deleteMessage(chatId, mutedUsers[userId].banMsgId).catch(() => {});
              }
              mutedUsers[userId] = false;
              bot.sendMessage(chatId, `✅ ผู้ใช้ @${msg.from.username || msg.from.first_name} สามารถพิมพ์ได้ตามปกติแล้ว`);
            }).catch(() => { mutedUsers[userId] = false; });
          }, 120000); // 2 นาที
        });
      }).catch(() => { mutedUsers[userId] = false; });
    }
    return;
  }

  // ตรวจสอบการทำงานปกติของบอท
  if (userSessions[userId]) {
    const session = userSessions[userId];

    if (session.step === 'ask_code_name') {
      session.codeName = text;
      if (session.isTrial) {
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
    } else if (session.step === 'ask_time_amount') {
      const timeAmount = parseInt(text);
      if (isNaN(timeAmount) || timeAmount <= 0) {
        bot.sendMessage(chatId, '⚠️ *กรุณาระบุจำนวนที่ถูกต้อง!*', { parse_mode: 'Markdown' });
      } else if (session.timeUnit === 'day' && (timeAmount < 1 || timeAmount > 30)) {
        bot.sendMessage(chatId, '⚠️ *กรุณาระบุจำนวนวันระหว่าง 1 ถึง 30 วันเท่านั้น!*', { parse_mode: 'Markdown' });
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
        session.step = 'ask_ip_limit';
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
                login((loginError) => {
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
              login((loginError) => {
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
                if (session.ipLimit && session.ipLimit > 0) {
                  requiredCredits += session.ipLimit * 1;
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
      if (!msg.reply_to_message) {
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
        return;
      }

      const userIdStr = userId.toString();
      const targetUserIdStr = session.targetUserId.toString();
      let userData = getUserData(userIdStr);
      let targetUserData = getUserData(targetUserIdStr);
      let currentCredits = userData.credits || 0;

      if (currentCredits < amount) {
        bot.sendMessage(chatId, `⚠️ *เครดิตไม่พอ!* คุณมี ${currentCredits} เครดิต แต่ต้องการโอน ${amount} เครดิต`, { parse_mode: 'Markdown' });
        delete userSessions[userId];
        return;
      }

      userData.credits = currentCredits - amount;
      targetUserData.credits = (targetUserData.credits || 0) + amount;
      saveUserData(userIdStr, userData);
      saveUserData(targetUserIdStr, targetUserData);

      bot.sendMessage(chatId, `✅ *โอนเครดิตสำเร็จ!* คุณได้โอน ${amount} เครดิตให้กับผู้ใช้ ID: ${session.targetUserId}\nเครดิตคงเหลือของคุณ: ${userData.credits} เครดิต`, { parse_mode: 'Markdown' });
      bot.sendMessage(session.targetUserId, `🎁 *คุณได้รับ ${amount} เครดิตจากผู้ใช้ ID: ${userId}*\nเครดิตปัจจุบันของคุณ: ${targetUserData.credits} เครดิต`, { parse_mode: 'Markdown' }).catch(console.error);
      delete userSessions[userId];
    } else if (session.step === 'givecredits_ask_user') {
      if (!msg.reply_to_message) {
        bot.sendMessage(chatId, '❌ *การเพิ่มเครดิตถูกยกเลิก เนื่องจากไม่ได้ตอบกลับข้อความของผู้รับ*', { parse_mode: 'Markdown' });
        delete userSessions[userId];
        return;
      }
      const targetUserId = msg.reply_to_message.from.id;
      if (targetUserId) {
        session.targetUserId = targetUserId;
        session.step = 'givecredits_ask_amount';
        const message = `💰 *กรุณาระบุจำนวนเครดิตที่ต้องการเพิ่มให้กับผู้ใช้ ID: ${targetUserId}*`;
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, '❌ *การเพิ่มเครดิตถูกยกเลิก เนื่องจากไม่พบผู้รับ*', { parse_mode: 'Markdown' });
        delete userSessions[userId];
      }
    } else if (session.step === 'givecredits_ask_amount') {
      const amount = parseInt(text);
      if (isNaN(amount) || amount <= 0) {
        bot.sendMessage(chatId, '⚠️ *กรุณาระบุจำนวนเครดิตที่ถูกต้อง!*', { parse_mode: 'Markdown' });
        return;
      }

      const targetUserIdStr = session.targetUserId.toString();
      let targetUserData = getUserData(targetUserIdStr);
      targetUserData.credits = (targetUserData.credits || 0) + amount;
      saveUserData(targetUserIdStr, targetUserData);

      bot.sendMessage(chatId, `✅ *เพิ่มเครดิตสำเร็จ!* คุณได้เพิ่ม ${amount} เครดิตให้กับผู้ใช้ ID: ${session.targetUserId}\nเครดิตปัจจุบันของผู้ใช้: ${targetUserData.credits} เครดิต`, { parse_mode: 'Markdown' });
      bot.sendMessage(session.targetUserId, `🎁 *คุณได้รับ ${amount} เครดิตจากแอดมิน*\nเครดิตปัจจุบันของคุณ: ${targetUserData.credits} เครดิต`, { parse_mode: 'Markdown' }).catch(console.error);
      delete userSessions[userId];
    }
  }
});

// ฟังก์ชันสำหรับส่งโค้ดให้ผู้ใช้
function sendCodeToUser(userId, chatId, clientCode, session, msg, expiryTime) {
  const userIdStr = userId.toString();
  let userData = getUserData(userIdStr);
  
  // ถ้าไม่ใช่โค้ดทดลอง ให้หักเครดิต
  if (!session.isTrial) {
    let requiredCredits;
    if (session.timeUnit === 'day') {
      requiredCredits = session.timeAmount * 2;
    } else if (session.timeUnit === 'hour') {
      requiredCredits = session.timeAmount * 5.4;
    } else if (session.timeUnit === 'minute') {
      requiredCredits = session.timeAmount * 0.1;
    }
    if (session.ipLimit && session.ipLimit > 0) {
      requiredCredits += session.ipLimit * 1;
    }
    requiredCredits = parseFloat(requiredCredits.toFixed(2));
    userData.credits = (userData.credits || 0) - requiredCredits;
  }

  // เพิ่มโค้ดใหม่ลงในรายการโค้ดของผู้ใช้
  if (!userData.codes) {
    userData.codes = [];
  }
  userData.codes.push({
    codeName: session.codeName,
    code: clientCode,
    creationDate: new Date().toISOString(),
    expiryTime: expiryTime,
    type: session.type,
    ipLimit: session.ipLimit,
    gbLimit: session.gbLimit
  });
  saveUserData(userIdStr, userData);

  // ส่งโค้ดให้ผู้ใช้ในแชทส่วนตัว
  if (chatId !== userId) {
    // ถ้าเป็นกลุ่ม ให้เก็บโค้ดไว้ส่งในแชทส่วนตัว
    userSessions[userId] = userSessions[userId] || {};
    userSessions[userId].pendingCode = { clientCode, session, msg, expiryTime };
    bot.sendMessage(userId, `🎉 *โค้ดของคุณพร้อมใช้งานแล้ว!*\n\n📝 *ชื่อโค้ด:* ${session.codeName}\n\n${clientCode}\n\n⏰ *หมดอายุ:* ${new Date(expiryTime).toLocaleString('th-TH')}\n\n📱 *วิธีใช้งาน:*\n1. คัดลอกโค้ดทั้งหมด\n2. เปิดแอพ V2rayNG\n3. กดปุ่ม + และเลือก "Import config from clipboard"\n4. เชื่อมต่อและเริ่มใช้งานได้ทันที!`, { parse_mode: 'Markdown' }).catch(error => {
      console.error('🚫 Error sending code to user:', error);
      bot.sendMessage(chatId, '⚠️ *ไม่สามารถส่งโค้ดไปยังแชทส่วนตัวได้ กรุณาเริ่มแชทกับบอทก่อน!*\n\nคลิกที่ @' + botUsername + ' และกด Start', { parse_mode: 'Markdown' });
    });
  } else {
    // ถ้าเป็นแชทส่วนตัวอยู่แล้ว ส่งโค้ดเลย
    bot.sendMessage(chatId, `🎉 *โค้ดของคุณพร้อมใช้งานแล้ว!*\n\n📝 *ชื่อโค้ด:* ${session.codeName}\n\n${clientCode}\n\n⏰ *หมดอายุ:* ${new Date(expiryTime).toLocaleString('th-TH')}\n\n📱 *วิธีใช้งาน:*\n1. คัดลอกโค้ดทั้งหมด\n2. เปิดแอพ V2rayNG\n3. กดปุ่ม + และเลือก "Import config from clipboard"\n4. เชื่อมต่อและเริ่มใช้งานได้ทันที!`, { parse_mode: 'Markdown' });
  }
}

// ตรวจสอบผู้ใช้ใหม่ทุก 5 นาที
setInterval(() => {
  const now = Date.now();
  const groupChatId = -1002415342873;
  
  for (let userId in newUserActivity) {
    const userData = newUserActivity[userId];
    
    // ถ้าผู้ใช้ไม่มีกิจกรรมเกิน 10 นาที และยังไม่ได้ส่งคำเตือน
    if (!userData.isActive && !userData.warningSent && (now - userData.joinTime > 10 * 60 * 1000)) {
      bot.sendMessage(groupChatId, `⚠️ @${userId} คุณยังไม่มีกิจกรรมใดๆ ในกลุ่ม คุณจะถูกนำออกจากกลุ่มในอีก 5 นาที หากไม่มีการใช้คำสั่งหรือส่งข้อความ`);
      userData.warningSent = true;
    }
    
    // ถ้าผู้ใช้ไม่มีกิจกรรมเกิน 15 นาที และยังไม่ถูกแบน
    if (!userData.isActive && userData.warningSent && !userData.isBanned && (now - userData.joinTime > 15 * 60 * 1000)) {
      bot.kickChatMember(groupChatId, userId, Math.floor(now / 1000) + 60).then(() => {
        bot.sendMessage(groupChatId, `🚫 ผู้ใช้ ID: ${userId} ถูกนำออกจากกลุ่มเนื่องจากไม่มีกิจกรรมใดๆ`);
        userData.isBanned = true;
      }).catch(error => {
        console.error(`🚫 Error kicking user ${userId}:`, error);
      });
    }
    
    // ลบข้อมูลผู้ใช้ที่ถูกแบนไปแล้วเกิน 1 ชั่วโมง
    if (userData.isBanned && (now - userData.joinTime > 60 * 60 * 1000)) {
      delete newUserActivity[userId];
    }
  }
}, 5 * 60 * 1000); // ทุก 5 นาที
