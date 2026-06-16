import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const clientId = 13;
const packageId = '8d8a7b88-9b89-49a7-a883-e7a74f29b1ec';
const serviceNotePrefix = '__service_meta__';

const sheetSessions = [
  ['2026-04-01', '07:30'],
  ['2026-04-03', '07:30'],
  ['2026-04-08', '07:30'],
  ['2026-04-10', '07:30'],
  ['2026-04-15', '07:30'],
  ['2026-04-17', '07:30'],
  ['2026-04-22', '07:30'],
  ['2026-04-24', '07:30'],
  ['2026-04-25', '12:00'],
  ['2026-04-28', '08:00'],
  ['2026-05-13', '08:00'],
  ['2026-05-20', '08:00'],
  ['2026-05-22', '08:00'],
  ['2026-05-25', '08:00'],
  ['2026-05-29', '08:00'],
  ['2026-06-02', '08:00'],
  ['2026-06-03', '08:00'],
  ['2026-06-05', '08:00'],
  ['2026-06-08', '08:00'],
];

const assertOk = (label, result) => {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
};

const medicalSummary = [
  'Chấn thương cũ: Cột sống L4-L5 thoái hoá nhẹ',
  'Bệnh lý: Không',
  'Dị ứng thực phẩm: Tôm (nhẹ)',
  'Dị ứng thuốc: Không',
  'Tiền sử phẫu thuật: Không',
  'Đang dùng thuốc: Không',
  'Hút thuốc: Không',
  'Uống đồ có cồn: Có',
  'BMI: 28.06 - 25-29.9 (Thừa cân nhẹ)',
  'Stress công việc: Trung Bình',
  'Khả năng phục hồi: Trung bình',
  'Nguy cơ chấn thương: Cao',
].join('\n');

const nutritionTargets = {
  calories: '2413',
  protein: '166',
  carbs: '230',
  fat: '66',
  water: '1.5 - 2.0',
  stepTarget: '< 5,000',
  fiber: '',
  supplementsPlan: '',
  strategyNotes:
    'Fat loss focus. BMR 1750 kcal, TDEE 2713 kcal. Long-term goal: GIẢM KG, MỠ TOÀN THÂN 76-79KG, TĂNG CƠ + CẮT NÉT BODY. Target weight: 80kg.',
};

const nutritionPlan = {
  focus: 'CUTTING, GIẢM MỠ TOÀN THÂN',
  coachingNotes:
    'Week: Tuần 1. Goal: Fat loss. Start date: 17/06/2026. Training day: 2413 kcal, P166/C230/F66. Day off: 1860 kcal, P166/C150/F66. Short-term goal: 4 tuần, deadline 08/07/2026. Long-term deadline: 02/09/2026.',
  days: [
    {
      label: 'Training Day',
      context: 'Training day',
      calories: '2413',
      protein: '166',
      carbs: '230',
      fat: '66',
      meals: [
        { name: 'Sáng', foods: '' },
        { name: 'Phụ', foods: '' },
        { name: 'Trưa', foods: '' },
        { name: 'Phụ', foods: '' },
        { name: 'Tối', foods: '' },
        { name: 'Phụ', foods: '' },
      ],
    },
    {
      label: 'Day Off',
      context: 'Rest day',
      calories: '1860',
      protein: '166',
      carbs: '150',
      fat: '66',
      meals: [
        { name: 'Sáng', foods: '' },
        { name: 'Phụ', foods: '' },
        { name: 'Trưa', foods: '' },
        { name: 'Phụ', foods: '' },
        { name: 'Tối', foods: '' },
        { name: 'Phụ', foods: '' },
      ],
    },
  ],
};

const nutritionPrep = {
  shoppingList:
    'Food swap options from Sheet: thăn bò, phi lê cá basa, thăn heo nạc, tôm, lòng trắng trứng, má đùi gà không da, đùi gà không da, cá hồi, cá thu, cá ngừ, đậu hũ, cơm gạo lứt, bánh mì trắng, bánh mì nguyên cám, bún trắng, phở, mì gạo, bún gạo lứt, khoai lang, khoai tây, yến mạch, ngô.',
  batchCooking: 'Định lượng đạm cân sống, trừ trứng. Tinh bột cân chín theo ghi chú trong Sheet.',
  pantryStaples: 'Cơm gạo lứt, bánh mì nguyên cám, bún gạo lứt, khoai lang, yến mạch.',
  eatingOutRules: 'Ưu tiên đủ protein, kiểm soát carb/fat theo target ngày tập/ngày nghỉ.',
  coachNotes: 'Imported from Google Sheet HÀ PHÚC HẬU | OFFLINE | V1.1 on 2026-06-16.',
};

const serviceMeta = {
  serviceType: 'training',
  serviceDetail: 'AESTHETICS PRO',
  coachNote:
    'Imported from Google Sheet. Contract: Active. Goal: Aesthetics. Current week: Tuần 1. Completion: 35%. Sessions used: 19/55, remaining: 36. Contract dates: 07/10/2025 - 14/09/2026. Phase: Cutting/Fat loss focus.',
  mealPrepItems: [],
};

const clientUpdate = {
  name: 'Hà Phúc Hậu',
  phone: '0333961133',
  username: '0333961133',
  gender: 'Male',
  dob: '1993-12-09',
  height: '172',
  weight: '83',
  goal: 'Aesthetics',
  jobtype: 'Văn Phòng / Vận động nhẹ',
  trainingtime: '6-8h/ngày',
  targetduration: '12 tuần',
  sleephabits: '5-6h, chất lượng Trung Bình',
  medicalconditions: medicalSummary,
  nutrition_targets: nutritionTargets,
  nutrition_plan: nutritionPlan,
  nutrition_prep: nutritionPrep,
  nutrition_updated_at: new Date().toISOString(),
};

const packageUpdate = {
  package_number: 1,
  session_count: 50,
  bonus_sessions: 5,
  total_sessions: 55,
  start_date: '2025-10-07',
  weekly_schedule: [
    { day: 1, time: '08:00' },
    { day: 3, time: '08:00' },
    { day: 5, time: '08:00' },
    { day: 6, time: '08:00' },
  ],
  note: `${serviceNotePrefix}${JSON.stringify(serviceMeta)}`,
  status: 'active',
};

assertOk(
  'update client',
  await supabase
    .from('clients')
    .update(clientUpdate)
    .eq('id', clientId)
    .select('id,name,phone,weight,nutrition_targets,nutrition_plan')
    .single(),
);

assertOk(
  'update package',
  await supabase
    .from('packages')
    .update(packageUpdate)
    .eq('id', packageId)
    .select('id,total_sessions,start_date,note')
    .single(),
);

const allSessions = assertOk(
  'load sessions',
  await supabase
    .from('sessions')
    .select('*')
    .eq('package_id', packageId)
    .order('session_number', { ascending: true })
    .order('created_at', { ascending: true }),
);

const chosenByNumber = new Map();
for (const session of allSessions) {
  if (session.cancel_reason === 'overflow_by_extra_session') continue;
  const sessionNumber = Number(session.session_number || 0);
  if (sessionNumber < 1 || sessionNumber > sheetSessions.length) continue;

  const current = chosenByNumber.get(sessionNumber);
  if (!current || (current.status === 'cancelled' && session.status !== 'cancelled')) {
    chosenByNumber.set(sessionNumber, session);
  }
}

const updatedSessions = [];
for (let index = 0; index < sheetSessions.length; index += 1) {
  const sessionNumber = index + 1;
  const target = chosenByNumber.get(sessionNumber);
  if (!target) continue;

  const [date, time] = sheetSessions[index];
  const payload = {
    session_number: sessionNumber,
    scheduled_date: date,
    scheduled_time: time,
    status: 'completed',
    completed_at: target.completed_at || `${date}T${time}:00+07:00`,
    cancelled_at: null,
    cancel_reason: null,
    session_kind: target.session_kind || 'fixed',
    notes: target.notes || 'Imported/completed from Google Sheet CONTRACT & SESSION.',
    workout_data: Array.isArray(target.workout_data) ? target.workout_data : null,
  };

  const updated = assertOk(
    `update session ${sessionNumber}`,
    await supabase
      .from('sessions')
      .update(payload)
      .eq('id', target.id)
      .select('id,session_number,scheduled_date,scheduled_time,status')
      .single(),
  );
  updatedSessions.push(updated);
}

const baselineRecord = {
  client_id: clientId,
  recorded_at: '2026-06-17T00:00:00+07:00',
  weight: 83,
  bmi: 28.06,
};

const existingInbody = assertOk(
  'load inbody',
  await supabase
    .from('inbody_records')
    .select('id')
    .eq('client_id', clientId)
    .eq('recorded_at', baselineRecord.recorded_at)
    .maybeSingle(),
);

const inbody = existingInbody?.id
  ? assertOk(
      'update inbody',
      await supabase.from('inbody_records').update(baselineRecord).eq('id', existingInbody.id).select('*').single(),
    )
  : assertOk('insert inbody', await supabase.from('inbody_records').insert([baselineRecord]).select('*').single());

const [verifyClient, verifyPackage, verifyCompleted] = await Promise.all([
  supabase
    .from('clients')
    .select('id,name,phone,weight,nutrition_targets,nutrition_plan,nutrition_prep')
    .eq('id', clientId)
    .single(),
  supabase.from('packages').select('id,total_sessions,start_date,status,note').eq('id', packageId).single(),
  supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('package_id', packageId).eq('status', 'completed'),
]);

console.log(JSON.stringify({
  ok: true,
  client: verifyClient.data,
  package: verifyPackage.data,
  completedSessionCount: verifyCompleted.count,
  updatedSessions,
  inbody,
}, null, 2));
