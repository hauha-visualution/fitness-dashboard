# PWA Setup Guide — Aesthetics Hub

## Bước 1: Cài dependencies

```bash
npm install
```

---

## Bước 2: Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Output sẽ như này:
```
Public Key: BNx...
Private Key: aXy...
```

Lưu lại 2 keys này.

---

## Bước 3: Thêm VAPID Public Key vào môi trường

Trong file `.env.local`, thêm:
```
VITE_VAPID_PUBLIC_KEY=<PUBLIC_KEY_từ_bước_2>
```

Trong Vercel Dashboard (Settings > Environment Variables), thêm tương tự.

---

## Bước 4: Chạy SQL trên Supabase

Vào Supabase Dashboard > SQL Editor, paste và chạy toàn bộ file:
```
SUPABASE_PUSH_SUBSCRIPTIONS.sql
```

---

## Bước 5: Deploy Edge Function

```bash
# Cài Supabase CLI nếu chưa có
brew install supabase/tap/supabase

# Login
supabase login

# Link project (lấy project-ref từ Supabase Dashboard URL)
supabase link --project-ref <project-ref>

# Set secrets cho Edge Function
supabase secrets set VAPID_PUBLIC_KEY=<PUBLIC_KEY_từ_bước_2>
supabase secrets set VAPID_PRIVATE_KEY=<PRIVATE_KEY_từ_bước_2>
supabase secrets set VAPID_SUBJECT=mailto:admin@aestheticshub.app

# Deploy Edge Function
supabase functions deploy send-push
```

---

## Bước 6: Tạo Webhook trong Supabase

Vào Supabase Dashboard > Database > Webhooks > "Create a new hook":

| Field | Giá trị |
|---|---|
| Name | `on_notification_insert` |
| Table | `public.notifications` |
| Events | `INSERT` |
| Type | `HTTP Request` |
| Method | `POST` |
| URL | `https://<project-ref>.supabase.co/functions/v1/send-push` |
| HTTP Headers | `Authorization: Bearer <SERVICE_ROLE_KEY>` |

> SERVICE_ROLE_KEY lấy tại: Supabase Dashboard > Settings > API > `service_role` key

---

## Bước 7: Tạo Icons

Cần tạo thư mục `public/icons/` với các file:

| File | Size | Cách tạo |
|---|---|---|
| `icon-192.png` | 192×192 | Export từ favicon.svg (dùng Figma/Canva/SVGOMG) |
| `icon-512.png` | 512×512 | Export từ favicon.svg |
| `apple-touch-icon.png` | 180×180 | Export từ favicon.svg |
| `badge-72.png` | 72×72 | Icon nhỏ (monochrome) cho Android notification bar |

**Cách nhanh nhất với sharp (Node.js):**
```bash
npm install -g sharp-cli

# Sau khi có favicon.svg
npx sharp-cli -i public/favicon.svg -o public/icons/icon-192.png resize 192 192
npx sharp-cli -i public/favicon.svg -o public/icons/icon-512.png resize 512 512
npx sharp-cli -i public/favicon.svg -o public/icons/apple-touch-icon.png resize 180 180
npx sharp-cli -i public/favicon.svg -o public/icons/badge-72.png resize 72 72
```

---

## Bước 8: Build & Deploy

```bash
npm run build
```

Push lên GitHub → Vercel tự deploy.

---

## Test trên iPhone

1. Mở Safari → vào URL Vercel của app
2. Bấm nút **Share** (ô vuông có mũi tên)
3. Chọn **"Add to Home Screen"**
4. Mở app từ icon trên màn hình chính
5. App hỏi quyền thông báo → bấm **"Bật thông báo"**
6. Test: Coach complete 1 session → trainee nhận push notification trên iPhone dù app đóng

---

## Lưu ý iOS

- iOS 16.4+ mới hỗ trợ Web Push từ PWA
- **Phải mở từ icon Home Screen**, không phải Safari browser
- Notification không hiện số badge trên icon (giới hạn của iOS PWA)
