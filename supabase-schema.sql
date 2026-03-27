-- =============================================================================
-- Supabase: общая таблица contacts + RLS + Realtime
-- Выполните в SQL Editor (Supabase Dashboard → SQL → New query).
-- =============================================================================

create table if not exists public.contacts (
  id uuid primary key,
  phone text not null default '',
  full_name text not null default '',
  city text not null default '',
  "user" text not null default '',
  comment text not null default '',
  owner text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.contacts is 'Общие контакты для всех клиентов приложения';
comment on column public.contacts.owner is 'Кто добавил / чей контакт (ник при входе)';
comment on column public.contacts."user" is 'Поле «юзер» в таблице CRM';

-- Автообновление updated_at при UPDATE
create or replace function public.contacts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row
  execute function public.contacts_set_updated_at();
-- Если Postgres ругается на «execute function», замените последнюю строку на:
--   execute procedure public.contacts_set_updated_at();

alter table public.contacts enable row level security;

drop policy if exists "contacts_anon_all" on public.contacts;
drop policy if exists "contacts_authenticated_all" on public.contacts;

-- ---------------------------------------------------------------------------
-- RLS: полный доступ для anon и authenticated (общая рабочая таблица без Auth).
-- Любой с URL проекта и anon-ключом из бандла может читать/писать.
-- Для продакшена позже: Supabase Auth + политики по auth.uid().
-- ---------------------------------------------------------------------------
create policy "contacts_anon_all"
  on public.contacts
  for all
  to anon
  using (true)
  with check (true);

create policy "contacts_authenticated_all"
  on public.contacts
  for all
  to authenticated
  using (true)
  with check (true);

-- Realtime: postgres_changes в клиенте требует таблицу в publication supabase_realtime.
do $pub$
begin
  alter publication supabase_realtime add table public.contacts;
exception
  when duplicate_object then
    null;
end
$pub$;
-- Если появится ошибка «already member of publication» — таблица уже в publication, это нормально.

-- Проверка: Dashboard → Database → Publications → supabase_realtime — в списке есть public.contacts.
