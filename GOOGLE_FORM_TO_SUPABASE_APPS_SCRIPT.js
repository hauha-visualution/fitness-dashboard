/* global FormApp, Logger, PropertiesService, SpreadsheetApp, UrlFetchApp */

const SUPABASE_PROJECT_URL = "https://vhidpztcaolmsgijhvtc.supabase.co";
const SUPABASE_TABLE = "survey_responses";

// eslint-disable-next-line no-unused-vars
function pushToSupabase(e) {
  try {
    if (!e || !e.response) {
      throw new Error("Missing form submit event.");
    }

    const payload = buildPayloadFromFormResponse_(e.response);
    const result = upsertSurveyResponse_(payload);

    Logger.log("pushToSupabase success");
    Logger.log(JSON.stringify(result, null, 2));
  } catch (error) {
    Logger.log("pushToSupabase error: " + error.message);
    throw error;
  }
}

function pushLatestSheetRowByPhone(phone) {
  const normalizedPhone = normalizePhone_(phone);
  if (!normalizedPhone) {
    throw new Error("Phone is required.");
  }

  const row = getLatestSheetRowByPhone_(normalizedPhone);
  if (!row) {
    throw new Error("No sheet row found for phone: " + normalizedPhone);
  }

  const payload = buildPayloadFromSheetRow_(row.headers, row.values);
  const result = upsertSurveyResponse_(payload);

  Logger.log("pushLatestSheetRowByPhone success");
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// eslint-disable-next-line no-unused-vars
function testPushCAM() {
  return pushLatestSheetRowByPhone("0909113799");
}

function buildPayloadFromFormResponse_(formResponse) {
  const payload = {};
  payload.email = safeRespondentEmail_(formResponse) || "";

  formResponse.getItemResponses().forEach(function(itemResponse) {
    const title = normalizeText_(itemResponse.getItem().getTitle());
    let answer = itemResponse.getResponse();

    if (Array.isArray(answer)) answer = answer.join(", ");
    if (answer === null || answer === undefined) answer = "";
    answer = String(answer).trim();
    if (!answer) return;

    applyAnswerToPayload_(payload, title, answer);
  });

  if (!payload.phone) {
    throw new Error("Phone is required to push survey response.");
  }

  return payload;
}

function buildPayloadFromSheetRow_(headers, values) {
  const payload = {};

  headers.forEach(function(header, index) {
    const title = normalizeText_(header);
    const answer = String(values[index] || "").trim();
    if (!answer) return;

    applyAnswerToPayload_(payload, title, answer);
  });

  if (!payload.phone) {
    throw new Error("Phone is required to push survey response.");
  }

  return payload;
}

function applyAnswerToPayload_(payload, title, answer) {
  if (hasAll_(title, ["ho", "ten"])) payload.name = answer;
  if (hasAny_(title, ["ngay thang nam sinh", "ngay sinh"])) payload.dob = answer;
  if (hasAny_(title, ["gioi tinh"])) payload.gender = answer;
  if (hasAny_(title, ["dien thoai", "so dien thoai", "sdt"])) payload.phone = normalizePhone_(answer);
  if (hasAny_(title, ["chieu cao"])) payload.height = answer;
  if (hasAny_(title, ["can nang"])) payload.weight = answer;
  if (hasAny_(title, ["email"])) payload.email = answer;

  if (hasAll_(title, ["dat muc tieu", "bao lau"]) || hasAny_(title, ["muon dat muc tieu nay trong bao lau"])) {
    payload.targetduration = answer;
  } else if (hasAny_(title, ["muc tieu"])) {
    payload.goal = answer;
  }

  if (hasAll_(title, ["tap luyen", "bao lau"]) || hasAny_(title, ["lich su tap", "da tap bao lau"])) {
    payload.traininghistory = answer;
  }

  if (
    hasAll_(title, ["tap luyen", "ngay"]) ||
    hasAny_(title, ["khung gio tap", "thoi gian tap", "lich tap"])
  ) {
    payload.trainingtime = answer;
  }

  if (hasAny_(title, ["cong viec", "tinh chat cong viec", "freelance", "hanh chinh", "nghe nghiep"])) {
    payload.jobtype = answer;
  }

  if (hasAny_(title, ["ngu", "giac ngu"])) {
    payload.sleephabits = answer;
  }

  if (hasAny_(title, ["tu nau", "gia dinh", "thoi quen nau", "an cung gia dinh", "an ngoai"])) {
    payload.cookinghabit = answer;
  }

  if (hasAny_(title, ["an kieng", "kieng dac biet", "di ung"])) {
    payload.dietaryrestriction = answer;
  }

  if (hasAny_(title, ["yeu thich", "dua vao meal plan", "mon an yeu thich"])) {
    payload.favoritefoods = answer;
  }

  if (hasAny_(title, ["khong an", "can tranh", "tranh"])) {
    payload.avoidfoods = answer;
  }

  if (hasAny_(title, ["thoi gian nau"])) {
    payload.cookingtime = answer;
  }

  if (hasAny_(title, ["ngan sach"])) {
    payload.foodbudget = answer;
  }

  if (hasAny_(title, ["van de suc khoe", "benh", "xuong khop", "tim mach"])) {
    payload.medicalconditions = answer;
  }

  if (hasAny_(title, ["thuoc", "bo sung", "thuc pham bo sung"])) {
    payload.supplements = answer;
  }

  if (hasAny_(title, ["tuan thu", "cam ket"])) {
    payload.commitmentlevel = answer;
  }
}

function getLatestSheetRowByPhone_(phone) {
  const form = FormApp.getActiveForm();
  const destinationId = form.getDestinationId();
  if (!destinationId) {
    throw new Error("This form is not linked to a response sheet.");
  }

  const spreadsheet = SpreadsheetApp.openById(destinationId);
  const sheet = spreadsheet.getSheetByName("Form Responses 1") || spreadsheet.getSheets()[0];
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return null;

  const headers = data[0];
  const phoneColumnIndex = findPhoneColumnIndex_(headers);
  if (phoneColumnIndex === -1) {
    throw new Error("Could not find phone column in response sheet.");
  }

  for (var i = data.length - 1; i >= 1; i--) {
    const rowPhone = normalizePhone_(data[i][phoneColumnIndex]);
    if (rowPhone === phone) {
      return {
        headers: headers,
        values: data[i],
      };
    }
  }

  return null;
}

function findPhoneColumnIndex_(headers) {
  for (var i = 0; i < headers.length; i++) {
    const header = normalizeText_(headers[i]);
    if (hasAny_(header, ["dien thoai", "so dien thoai", "sdt"])) {
      return i;
    }
  }
  return -1;
}

function upsertSurveyResponse_(payload) {
  const supabaseKey = getSupabaseKey_();
  const url = SUPABASE_PROJECT_URL + "/rest/v1/" + SUPABASE_TABLE + "?on_conflict=phone";

  const options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      apikey: supabaseKey,
      Authorization: "Bearer " + supabaseKey,
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const body = response.getContentText();

  Logger.log("Supabase code: " + code);
  Logger.log("Supabase body: " + body);

  if (code < 200 || code >= 300) {
    throw new Error("Supabase error " + code + ": " + body);
  }

  return {
    code: code,
    body: body,
    payload: payload
  };
}

function getSupabaseKey_() {
  const key = PropertiesService.getScriptProperties().getProperty("SUPABASE_KEY");
  if (!key) {
    throw new Error("Missing Script Property SUPABASE_KEY.");
  }
  return key;
}

function safeRespondentEmail_(formResponse) {
  try {
    return formResponse.getRespondentEmail() || "";
  } catch {
    return "";
  }
}

function normalizeText_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone_(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

function hasAny_(text, keywords) {
  return keywords.some(function(keyword) {
    return text.indexOf(normalizeText_(keyword)) !== -1;
  });
}

function hasAll_(text, keywords) {
  return keywords.every(function(keyword) {
    return text.indexOf(normalizeText_(keyword)) !== -1;
  });
}
