# Firebase Migration Plan

## Goal

Move the app from Supabase to Firebase without breaking the current production app. The migration must run side-by-side first, then cut over only after auth, data, storage, and notification flows are verified with real coach and trainee accounts.

## Current Supabase Surface

The app currently depends on:

- Auth: coach and trainee login through Supabase Auth using internal emails derived from username/phone.
- Database: `coaches`, `clients`, `packages`, `sessions`, `payments`, `workout_templates`, `template_exercises`, `template_assignments`, `nutrition_checkins`, `survey_responses`, `inbody_records`, `notifications`, `push_subscriptions`.
- Storage: `avatars`, `client-avatars`, `client-progress`.
- RPC/business logic: `client_submit_payment`, `insert_extra_package_session`, `repair_package_schedule`, `cancel_and_shift_fixed_session`.
- Realtime: notification bell subscribes to `notifications`.
- Push: Vercel API and Supabase Edge Function currently send Web Push.

## Migration Strategy

Do not replace Supabase in one edit. Use a staged migration:

1. Create Firebase project and service account.
2. Import a Supabase backup into Firestore under a new schema.
3. Add Firebase Auth users while preserving the existing username-to-email convention.
4. Port read-only client/coach dashboards behind a feature flag.
5. Port write flows and business logic into server APIs or Cloud Functions.
6. Port Storage assets.
7. Port notifications and push subscriptions.
8. Run Supabase and Firebase in parallel until parity checks pass.
9. Switch production with a single backend flag.

## Target Firestore Schema

Use top-level collections to avoid expensive cross-document traversal and to keep dashboard queries simple.

### `users/{uid}`

```json
{
  "uid": "firebase-auth-uid",
  "supabaseAuthUserId": "old uuid",
  "username": "minouha | 0333961133",
  "email": "minouha@aestheticshub.app",
  "role": "coach | trainee",
  "displayName": "Hà Phúc Hậu",
  "createdAt": "timestamp",
  "migratedAt": "timestamp"
}
```

### `coaches/{coachId}`

Document ID should use the old Supabase coach UUID when available.

```json
{
  "supabaseId": "uuid",
  "authUserId": "firebase uid",
  "supabaseAuthUserId": "old uuid",
  "email": "coach email",
  "bankQrUrl": "...",
  "bankName": "...",
  "bankBranch": "...",
  "bankAccountName": "...",
  "bankAccountNumber": "..."
}
```

### `clients/{clientId}`

Use stringified Supabase numeric `clients.id` as document ID.

```json
{
  "supabaseId": 13,
  "authUserId": "firebase uid",
  "supabaseAuthUserId": "old uuid",
  "coachEmail": "coach email",
  "coachAuthUserId": "firebase uid",
  "username": "0333961133",
  "phone": "0333961133",
  "name": "Hà Phúc Hậu",
  "avatarUrl": "...",
  "nutritionTargets": {},
  "nutritionPlan": {},
  "nutritionPrep": {}
}
```

### `packages/{packageId}`

Use old Supabase UUID as document ID.

```json
{
  "clientId": "13",
  "coachEmail": "coach email",
  "clientAuthUserId": "firebase uid",
  "packageNumber": 1,
  "sessionCount": 12,
  "bonusSessions": 0,
  "totalSessions": 12,
  "price": 0,
  "startDate": "YYYY-MM-DD",
  "weeklySchedule": [],
  "note": "",
  "status": "active | completed",
  "createdAt": "timestamp"
}
```

### `sessions/{sessionId}`

Use old Supabase UUID as document ID. Denormalize `coachEmail` for permissions and dashboard queries.

```json
{
  "clientId": "13",
  "packageId": "uuid",
  "coachEmail": "coach email",
  "clientAuthUserId": "firebase uid",
  "sessionNumber": 1,
  "scheduledDate": "YYYY-MM-DD",
  "scheduledTime": "HH:mm:ss",
  "status": "scheduled | completed | cancelled",
  "sessionKind": "fixed | extra",
  "sourceSessionId": null,
  "notes": "",
  "feeling": "",
  "cancelReason": "",
  "workoutData": {},
  "workoutTemplateId": "uuid",
  "completedAt": "timestamp",
  "cancelledAt": "timestamp",
  "createdAt": "timestamp"
}
```

### `payments/{paymentId}`

Use stringified Supabase numeric ID.

```json
{
  "clientId": "13",
  "packageId": "uuid",
  "coachEmail": "coach email",
  "clientAuthUserId": "firebase uid",
  "packageNumber": 1,
  "amount": 0,
  "status": "pending | submitted | paid | cancelled",
  "paymentType": "package | nutrition | prep_meal | stretching | other",
  "title": "",
  "note": "",
  "detailNote": "",
  "paymentMethod": "",
  "createdBy": "coach | client",
  "customerMarkedAt": "timestamp",
  "coachConfirmedAt": "timestamp",
  "paidAt": "timestamp",
  "cancelledAt": "timestamp",
  "createdAt": "timestamp"
}
```

### `notifications/{notificationId}`

Use old Supabase UUID as document ID.

```json
{
  "recipientUserId": "firebase uid",
  "supabaseRecipientUserId": "old uuid",
  "type": "payment_created",
  "title": "",
  "body": "",
  "metadata": {},
  "isRead": false,
  "createdAt": "timestamp"
}
```

### `pushSubscriptions/{subscriptionId}`

Use old Supabase UUID as document ID.

```json
{
  "userId": "firebase uid",
  "supabaseUserId": "old uuid",
  "endpoint": "...",
  "p256dh": "...",
  "auth": "...",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Business Logic To Rewrite

These Supabase RPCs need server-side Firebase equivalents:

- `client_submit_payment`: Cloud Function/API validates client ownership and updates payment from `pending` to `submitted`.
- `insert_extra_package_session`: transaction inserts an extra session and resequences when needed.
- `repair_package_schedule`: transaction repairs session count based on package schedule.
- `cancel_and_shift_fixed_session`: transaction cancels one session and inserts/reorders the next scheduled fixed session.

## Security Rules Direction

Rules should enforce:

- Coaches can read/write clients where `coachEmail == request.auth.token.email`.
- Trainees can read their own client profile via `authUserId == request.auth.uid`.
- Packages/sessions/payments must denormalize `coachEmail` and `clientAuthUserId` or be written through server APIs.
- Notifications readable/updatable only by `recipientUserId == request.auth.uid`.
- Push subscriptions manageable only by `userId == request.auth.uid`.

For complex writes, prefer server APIs/Cloud Functions instead of trying to encode relational checks entirely in Firestore rules.

## Cutover Criteria

Firebase is production-ready only when:

- All current Supabase backup rows import without errors.
- `minouha` and `0333961133` can login with Firebase Auth.
- Coach dashboard count and calendar match Supabase.
- Trainee portal sessions, package, nutrition, and payments match Supabase.
- Avatar/progress image uploads work.
- Notifications appear in-app and push to iOS PWA.
- Payment submit/confirm and session complete/cancel flows pass end-to-end.

## Required Access

To execute the migration, provide:

- Firebase project ID.
- Firebase web app config for frontend.
- Firebase service account JSON for migration/admin scripts.
- Enabled Firebase Auth Email/Password provider.
- Firestore database created in production mode or test mode.
- Firebase Storage bucket enabled.
- Optional: Firebase Cloud Messaging web push/VAPID config if switching from current Web Push.
