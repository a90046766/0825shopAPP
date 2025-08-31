-- Add temporary contact fields for staff and technicians

alter table if exists public.staff
  add column if not exists temp_contact text;

alter table if exists public.technicians
  add column if not exists temp_contact text;


