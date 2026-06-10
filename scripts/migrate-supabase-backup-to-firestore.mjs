import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const backupDir = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!backupDir) {
  console.error('Usage: node scripts/migrate-supabase-backup-to-firestore.mjs <backup-dir> [--dry-run]');
  process.exit(1);
}

const resolvedBackupDir = path.resolve(backupDir);

if (!dryRun && !getApps().length) {
  initializeApp({
    credential: getCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = dryRun ? null : getFirestore();
const auth = dryRun ? null : getAuth();

const tables = {
  coaches: await readTable('coaches'),
  clients: await readTable('clients'),
  packages: await readTable('packages'),
  sessions: await readTable('sessions'),
  payments: await readTable('payments'),
  workout_templates: await readTable('workout_templates'),
  template_exercises: await readTable('template_exercises'),
  template_assignments: await readTable('template_assignments'),
  nutrition_checkins: await readTable('nutrition_checkins'),
  survey_responses: await readTable('survey_responses'),
  inbody_records: await readTable('inbody_records'),
  notifications: await readTable('notifications'),
  push_subscriptions: await readTable('push_subscriptions'),
};

const clientById = new Map(tables.clients.map((client) => [String(client.id), client]));
const clientBySupabaseAuthId = new Map(
  tables.clients.filter((client) => client.auth_user_id).map((client) => [client.auth_user_id, client])
);
const coachByEmail = new Map(tables.coaches.map((coach) => [coach.email, coach]));
const userIdMap = new Map();

await ensureAuthUsers();
await migrateCollection('coaches', tables.coaches.map(mapCoach));
await migrateCollection('clients', tables.clients.map(mapClient));
await migrateCollection('packages', tables.packages.map(mapPackage));
await migrateCollection('sessions', tables.sessions.map(mapSession));
await migrateCollection('payments', tables.payments.map(mapPayment));
await migrateCollection('workoutTemplates', tables.workout_templates.map(mapWorkoutTemplate));
await migrateCollection('templateExercises', tables.template_exercises.map(mapTemplateExercise));
await migrateCollection('templateAssignments', tables.template_assignments.map(mapTemplateAssignment));
await migrateCollection('nutritionCheckins', tables.nutrition_checkins.map(mapNutritionCheckin));
await migrateCollection('surveyResponses', tables.survey_responses.map(mapSurveyResponse));
await migrateCollection('inbodyRecords', tables.inbody_records.map(mapInbodyRecord));
await migrateCollection('notifications', tables.notifications.map(mapNotification));
await migrateCollection('pushSubscriptions', tables.push_subscriptions.map(mapPushSubscription));

console.log(dryRun ? 'Dry run completed.' : 'Migration completed.');

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.');
}

async function readTable(table) {
  const file = path.join(resolvedBackupDir, `${table}.json`);
  const contents = await fs.readFile(file, 'utf8');
  return JSON.parse(contents);
}

async function ensureAuthUsers() {
  const users = [
    ...tables.coaches.map((coach) => ({
      role: 'coach',
      username: usernameFromEmail(coach.email),
      email: coach.email,
      displayName: usernameFromEmail(coach.email),
      supabaseAuthUserId: coach.auth_user_id,
    })),
    ...tables.clients.map((client) => ({
      role: 'trainee',
      username: client.username || client.phone,
      email: toAuthEmail(client.username || client.phone),
      displayName: client.name,
      supabaseAuthUserId: client.auth_user_id,
    })),
  ].filter((user) => user.email && user.supabaseAuthUserId);

  for (const user of users) {
    const firebaseUser = await findOrCreateAuthUser(user);
    userIdMap.set(user.supabaseAuthUserId, firebaseUser.uid);

    await writeDoc('users', firebaseUser.uid, {
      uid: firebaseUser.uid,
      supabaseAuthUserId: user.supabaseAuthUserId,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName || user.username,
      migratedAt: FieldValue.serverTimestamp(),
    });
  }
}

async function findOrCreateAuthUser(user) {
  if (dryRun) {
    return { uid: `dry-${user.supabaseAuthUserId}`, email: user.email };
  }

  try {
    return await auth.getUserByEmail(user.email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }

  return auth.createUser({
    email: user.email,
    displayName: user.displayName || user.username,
    password: process.env.FIREBASE_DEFAULT_MIGRATION_PASSWORD || randomPassword(),
    emailVerified: true,
  });
}

async function migrateCollection(collection, docs) {
  const validDocs = docs.filter(Boolean);
  console.log(`${dryRun ? '[dry-run] ' : ''}${collection}: ${validDocs.length} docs`);

  for (let i = 0; i < validDocs.length; i += 450) {
    const chunk = validDocs.slice(i, i + 450);
    if (dryRun) continue;

    const batch = db.batch();
    for (const doc of chunk) {
      batch.set(db.collection(collection).doc(doc.id), doc.data, { merge: true });
    }
    await batch.commit();
  }
}

async function writeDoc(collection, id, data) {
  if (dryRun) {
    console.log(`[dry-run] ${collection}/${id}`);
    return;
  }

  await db.collection(collection).doc(String(id)).set(stripUndefined(data), { merge: true });
}

function mapCoach(coach) {
  const uid = userIdMap.get(coach.auth_user_id) || null;
  return doc(coach.id, {
    supabaseId: coach.id,
    authUserId: uid,
    supabaseAuthUserId: coach.auth_user_id || null,
    email: coach.email,
    bankQrUrl: coach.bank_qr_url || null,
    bankName: coach.bank_name || null,
    bankBranch: coach.bank_branch || null,
    bankAccountName: coach.bank_account_name || null,
    bankAccountNumber: coach.bank_account_number || null,
    createdAt: toTimestamp(coach.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapClient(client) {
  const coach = coachByEmail.get(client.coach_email);
  return doc(String(client.id), {
    supabaseId: client.id,
    authUserId: userIdMap.get(client.auth_user_id) || null,
    supabaseAuthUserId: client.auth_user_id || null,
    coachEmail: client.coach_email || null,
    coachAuthUserId: coach?.auth_user_id ? userIdMap.get(coach.auth_user_id) || null : null,
    username: client.username || client.phone || null,
    phone: client.phone || null,
    name: client.name || null,
    avatarUrl: client.avatar_url || null,
    goal: client.goal || null,
    nutritionTargets: client.nutrition_targets || {},
    nutritionPlan: client.nutrition_plan || {},
    nutritionPrep: client.nutrition_prep || {},
    nutritionUpdatedAt: toTimestamp(client.nutrition_updated_at),
    nutritionProfileSyncedAt: toTimestamp(client.nutrition_profile_synced_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapPackage(pkg) {
  const client = clientById.get(String(pkg.client_id));
  return doc(pkg.id, {
    supabaseId: pkg.id,
    clientId: String(pkg.client_id),
    coachEmail: client?.coach_email || null,
    clientAuthUserId: client?.auth_user_id ? userIdMap.get(client.auth_user_id) || null : null,
    packageNumber: pkg.package_number,
    sessionCount: pkg.session_count,
    bonusSessions: pkg.bonus_sessions,
    totalSessions: pkg.total_sessions,
    price: pkg.price,
    startDate: pkg.start_date || null,
    weeklySchedule: pkg.weekly_schedule || [],
    note: pkg.note || null,
    status: pkg.status,
    createdAt: toTimestamp(pkg.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapSession(session) {
  const client = clientById.get(String(session.client_id));
  return doc(session.id, {
    supabaseId: session.id,
    clientId: String(session.client_id),
    packageId: session.package_id,
    coachEmail: client?.coach_email || null,
    clientAuthUserId: client?.auth_user_id ? userIdMap.get(client.auth_user_id) || null : null,
    sessionNumber: session.session_number,
    scheduledDate: session.scheduled_date,
    scheduledTime: session.scheduled_time,
    status: session.status,
    sessionKind: session.session_kind || 'fixed',
    sourceSessionId: session.source_session_id || null,
    notes: session.notes || null,
    feeling: session.feeling || null,
    cancelReason: session.cancel_reason || null,
    workoutData: session.workout_data || null,
    workoutTemplateId: session.workout_template_id || null,
    completedAt: toTimestamp(session.completed_at),
    cancelledAt: toTimestamp(session.cancelled_at),
    createdAt: toTimestamp(session.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapPayment(payment) {
  const client = clientById.get(String(payment.client_id));
  return doc(String(payment.id), {
    supabaseId: payment.id,
    clientId: String(payment.client_id),
    packageId: payment.package_id || null,
    coachEmail: client?.coach_email || null,
    clientAuthUserId: client?.auth_user_id ? userIdMap.get(client.auth_user_id) || null : null,
    packageNumber: payment.package_number || null,
    amount: payment.amount,
    status: payment.status,
    paymentType: payment.payment_type,
    title: payment.title || null,
    note: payment.note || null,
    detailNote: payment.detail_note || null,
    paymentMethod: payment.payment_method || null,
    createdBy: payment.created_by,
    customerMarkedAt: toTimestamp(payment.customer_marked_at),
    coachConfirmedAt: toTimestamp(payment.coach_confirmed_at),
    paidAt: toTimestamp(payment.paid_at),
    cancelledAt: toTimestamp(payment.cancelled_at),
    createdAt: toTimestamp(payment.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapWorkoutTemplate(template) {
  return doc(template.id, {
    supabaseId: template.id,
    coachEmail: template.coach_email,
    name: template.name,
    createdAt: toTimestamp(template.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapTemplateExercise(exercise) {
  return doc(exercise.id, {
    supabaseId: exercise.id,
    templateId: exercise.template_id,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    weight: exercise.weight,
    note: exercise.note || null,
    sortOrder: exercise.sort_order,
    createdAt: toTimestamp(exercise.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapTemplateAssignment(assignment) {
  return doc(assignment.id, {
    supabaseId: assignment.id,
    templateId: assignment.template_id,
    clientId: String(assignment.client_id),
    createdAt: toTimestamp(assignment.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapNutritionCheckin(checkin) {
  return doc(checkin.id, {
    ...camelizeKeys(checkin),
    clientId: String(checkin.client_id),
    createdAt: toTimestamp(checkin.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapSurveyResponse(response) {
  return doc(String(response.id), {
    ...camelizeKeys(response),
    clientId: response.client_id ? String(response.client_id) : null,
    createdAt: toTimestamp(response.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapInbodyRecord(record) {
  return doc(String(record.id), {
    ...camelizeKeys(record),
    clientId: String(record.client_id),
    createdAt: toTimestamp(record.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapNotification(notification) {
  return doc(notification.id, {
    supabaseId: notification.id,
    recipientUserId: userIdMap.get(notification.recipient_user_id) || null,
    supabaseRecipientUserId: notification.recipient_user_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    metadata: notification.metadata || {},
    isRead: notification.is_read,
    createdAt: toTimestamp(notification.created_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function mapPushSubscription(subscription) {
  return doc(subscription.id, {
    supabaseId: subscription.id,
    userId: userIdMap.get(subscription.user_id) || null,
    supabaseUserId: subscription.user_id,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    createdAt: toTimestamp(subscription.created_at),
    updatedAt: toTimestamp(subscription.updated_at),
    migratedAt: FieldValue.serverTimestamp(),
  });
}

function doc(id, data) {
  return { id: String(id), data: stripUndefined(data) };
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== 'object' || value instanceof Timestamp) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefined(entry)])
  );
}

function toTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Timestamp.fromDate(date);
}

function toAuthEmail(username) {
  return `${String(username || '').toLowerCase().replace(/\s/g, '')}@aestheticshub.app`;
}

function usernameFromEmail(email = '') {
  return email.replace(/@aestheticshub\.app$/i, '');
}

function randomPassword() {
  return `Migrated-${randomUUID()}!`;
}

function camelizeKeys(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camelize(key), value]));
}

function camelize(key) {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
