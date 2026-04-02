# Google Form -> Supabase Sync Checklist

Muc tieu: xu ly triet de truong hop client da dien/sua Google Form nhung app nutrition van khong nhan du lieu moi.

## 1. Xac nhan du lieu co vao `survey_responses` hay chua

- Mo Supabase Table Editor -> `survey_responses`
- Tim theo `phone` cua client
- Kiem tra:
  - co row hay khong
  - `created_at` co phai la timestamp moi nhat hay khong
  - cac cot nutrition co gia tri hay van rong

Neu row cu van la row cu, van de nam o Google side, khong nam o React app.

## 2. Phan biet `submit moi` va `edit response`

Apps Script thuong chi bat trigger `onFormSubmit`.

He qua:
- client submit form lan dau -> co row vao Supabase
- client quay lai sua response -> Apps Script khong chay lai
- app van doc row cu trong `survey_responses`

Neu ban vua "bo sung full data" cho client nhung `created_at` trong Supabase khong doi, kha nang cao la ban da edit response thay vi tao submit moi, hoac trigger khong chay lai.

## 3. Kiem tra Apps Script trigger

Trong Google Apps Script:

- vao `Triggers`
- kiem tra co trigger installable dang bat cho:
  - `From form`
  - event type `On form submit`

Neu can dong bo khi sua response trong Google Sheet:
- can co them luong update rieng
- `onFormSubmit` khong du

## 4. Kiem tra script dang `insert` hay `upsert`

Neu script chi `insert`:
- moi lan submit moi se tao row moi
- edit response cu khong cap nhat row cu

Nen doi thanh logic:
- tim theo `phone`
- neu da ton tai -> `update`
- neu chua ton tai -> `insert`

## 5. Kiem tra mapping cot trong script

Can chac chan script dang day dung cac cot nay:

- `cookinghabit`
- `cookingtime`
- `foodbudget`
- `dietaryrestriction`
- `avoidfoods`
- `favoritefoods`
- `medicalconditions`
- `supplements`
- `commitmentlevel`

Neu script dang day theo camelCase nhu:

- `cookingHabit`
- `favoriteFoods`
- `medicalConditions`

thi app hien tai van doc duoc, nhung nen thong nhat de tranh roi.

## 6. Kiem tra so dien thoai dung de match

App dang so sanh theo cac bien the:

- `0909...`
- `0909...` khong khoang trang
- chi digits
- `84909...`
- `+84909...`

Neu script luu phone voi format khac nua, can bo sung format o script hoac normalize truoc khi ghi vao Supabase.

## 7. Cach debug nhanh trong app

Mo tab `Nutrition` cua client va bam `Check Sync`.

Xem 3 thu sau:

- `Survey row`
- `Field da dien`
- panel `Sync Debug`

Neu:

- `Survey row = Da thay`
- `Field da dien = 0/9`

thi nghia la Supabase da co row, nhung nutrition field van rong.

Neu:

- `Survey row = --`

thi nghia la app khong tim thay row theo phone.

## 8. Huong xu ly ben Google de het loi han

Huong tot nhat:

1. Google Form submit -> Apps Script goi webhook
2. Script normalize phone
3. Script `upsert` vao `survey_responses` theo `phone`
4. Script cap nhat cac nutrition field theo snake_case thong nhat
5. Neu cho phep edit response, bo sung luong sync lai khi row trong Google Sheet thay doi

## 9. Ket luan cho case `CAM`

Neu app debug cho thay:

- co row trong `survey_responses`
- `created_at` van cu
- nutrition field van rong

thi can sua Google side truoc. React app khong the tu sinh du lieu moi neu Supabase van chua nhan du lieu da sua.
