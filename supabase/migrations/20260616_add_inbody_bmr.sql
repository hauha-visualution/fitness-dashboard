alter table public.inbody_records
  add column if not exists bmr numeric;

alter table public.inbody_records
  alter column vfat type numeric using vfat::numeric;
