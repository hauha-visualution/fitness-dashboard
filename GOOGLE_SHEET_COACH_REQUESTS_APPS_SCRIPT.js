const TELEGRAM_BOT_TOKEN_KEY = 'TELEGRAM_BOT_TOKEN';
const TELEGRAM_CHAT_ID_KEY = 'TELEGRAM_CHAT_ID';
const NOTIFY_EMAIL_KEY = 'COACH_REQUEST_NOTIFY_EMAIL';
const SHEET_NAME_KEY = 'COACH_REQUEST_SHEET_NAME';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    validatePayload_(payload);

    appendToSheet_(payload);
    sendTelegramMessage_(payload);
    sendEmail_(payload);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function validatePayload_(payload) {
  if (!payload.full_name || !payload.phone || !payload.email) {
    throw new Error('Missing required fields.');
  }
}

function appendToSheet_(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = PropertiesService.getScriptProperties().getProperty(SHEET_NAME_KEY) || 'Coach Requests';
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(['Timestamp', 'Full Name', 'Phone', 'Email', 'Source']);
  }

  sheet.appendRow([
    new Date(),
    payload.full_name,
    payload.phone,
    payload.email,
    payload.source || 'main_login',
  ]);
}

function sendTelegramMessage_(payload) {
  const token = PropertiesService.getScriptProperties().getProperty(TELEGRAM_BOT_TOKEN_KEY);
  const chatId = PropertiesService.getScriptProperties().getProperty(TELEGRAM_CHAT_ID_KEY);
  if (!token || !chatId) return;

  const text = [
    'New coach account request',
    'Name: ' + payload.full_name,
    'Phone: ' + payload.phone,
    'Email: ' + payload.email,
    'Source: ' + (payload.source || 'main_login'),
  ].join('\n');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
    muteHttpExceptions: true,
  });
}

function sendEmail_(payload) {
  const notifyEmail = PropertiesService.getScriptProperties().getProperty(NOTIFY_EMAIL_KEY);
  if (!notifyEmail) return;

  MailApp.sendEmail({
    to: notifyEmail,
    subject: 'New coach account request',
    htmlBody: [
      '<p>A new coach account request was submitted.</p>',
      '<ul>',
      '<li><strong>Name:</strong> ' + payload.full_name + '</li>',
      '<li><strong>Phone:</strong> ' + payload.phone + '</li>',
      '<li><strong>Email:</strong> ' + payload.email + '</li>',
      '<li><strong>Source:</strong> ' + (payload.source || 'main_login') + '</li>',
      '</ul>',
    ].join(''),
  });
}
