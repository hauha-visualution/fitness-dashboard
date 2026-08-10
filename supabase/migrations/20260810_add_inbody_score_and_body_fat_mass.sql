alter table public.inbody_records
  add column if not exists body_fat_mass numeric,
  add column if not exists inbody_score numeric;
