-- Supabase schema for GrowUp app (profiles, tasks, rewards, completions, settings, account settings)

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_id text not null default '01',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create unique index if not exists profiles_owner_display_name_unique
  on public.profiles (owner_id, lower(display_name));

create table if not exists public.tasks (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  title text not null,
  points integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_id, profile_id, id),
  foreign key (owner_id, profile_id) references public.profiles (owner_id, id) on delete cascade
);

create table if not exists public.rewards (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  title text not null,
  cost integer not null,
  limit_per_cycle integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  redeemed_at timestamptz,
  deleted_at timestamptz,
  primary key (owner_id, profile_id, id),
  foreign key (owner_id, profile_id) references public.profiles (owner_id, id) on delete cascade
);

create table if not exists public.redemptions (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  reward_id uuid not null,
  reward_title text not null,
  cost integer not null,
  redeemed_at timestamptz not null default now(),
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (owner_id, profile_id, reward_id) references public.rewards (owner_id, profile_id, id) on delete cascade
);

create table if not exists public.completions (
  id text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  task_id uuid not null,
  date date not null,
  points integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_id, profile_id, id),
  foreign key (owner_id, profile_id, task_id) references public.tasks (owner_id, profile_id, id) on delete cascade
);

create table if not exists public.settings (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  cycle_type text not null default 'biweekly' check (cycle_type in ('weekly', 'biweekly', 'monthly', 'yearly')),
  cycle_start_date date not null,
  level_up_points integer not null,
  avatar_id text not null default '01',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, profile_id, id),
  constraint settings_id_matches_profile check (id = profile_id),
  foreign key (owner_id, profile_id) references public.profiles (owner_id, id) on delete cascade
);

create table if not exists public.account_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  language text not null check (language in ('en', 'pt', 'fr', 'es')),
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  plan text not null default 'FREE' check (plan in ('FREE', 'BETA', 'PRO', 'DEV')),
  flags jsonb not null default '{}'::jsonb,
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger rewards_touch_updated_at
before update on public.rewards
for each row execute function public.touch_updated_at();

create trigger redemptions_touch_updated_at
before update on public.redemptions
for each row execute function public.touch_updated_at();

create trigger completions_touch_updated_at
before update on public.completions
for each row execute function public.touch_updated_at();

create trigger settings_touch_updated_at
before update on public.settings
for each row execute function public.touch_updated_at();

create trigger account_settings_touch_updated_at
before update on public.account_settings
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.completions enable row level security;
alter table public.settings enable row level security;
alter table public.account_settings enable row level security;

create policy "profiles_read_own" on public.profiles
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "profiles_write_own" on public.profiles
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create or replace function public.has_accepted_terms()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.account_settings
    where owner_id = auth.uid()
      and terms_version is not null
      and terms_accepted_at is not null
  );
$$;

 

create policy "tasks_read_own" on public.tasks
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "tasks_write_own" on public.tasks
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "tasks_update_own" on public.tasks
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "tasks_delete_own" on public.tasks
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "rewards_read_own" on public.rewards
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "rewards_write_own" on public.rewards
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "rewards_update_own" on public.rewards
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "rewards_delete_own" on public.rewards
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "redemptions_read_own" on public.redemptions
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "redemptions_write_own" on public.redemptions
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "redemptions_update_own" on public.redemptions
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "redemptions_delete_own" on public.redemptions
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "completions_read_own" on public.completions
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "completions_write_own" on public.completions
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "completions_update_own" on public.completions
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "completions_delete_own" on public.completions
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "settings_read_own" on public.settings
for select using (auth.uid() = owner_id and public.has_accepted_terms());

create policy "settings_write_own" on public.settings
for insert with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "settings_update_own" on public.settings
for update using (auth.uid() = owner_id and public.has_accepted_terms())
with check (auth.uid() = owner_id and public.has_accepted_terms());

create policy "account_settings_read_own" on public.account_settings
for select using (auth.uid() = owner_id);

create policy "account_settings_write_own" on public.account_settings
for insert with check (auth.uid() = owner_id);

create policy "account_settings_update_own" on public.account_settings
for update using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "account_settings_delete_own" on public.account_settings
for delete using (auth.uid() = owner_id);

create index if not exists tasks_owner_profile_idx on public.tasks (owner_id, profile_id);
create index if not exists rewards_owner_profile_idx on public.rewards (owner_id, profile_id);
create index if not exists completions_owner_profile_idx on public.completions (owner_id, profile_id);
create index if not exists redemptions_owner_profile_idx on public.redemptions (owner_id, profile_id);
create index if not exists settings_owner_profile_idx on public.settings (owner_id, profile_id);
create index if not exists completions_owner_date_idx on public.completions (owner_id, date);
create index if not exists redemptions_owner_date_idx on public.redemptions (owner_id, date);
create index if not exists tasks_owner_deleted_idx on public.tasks (owner_id, deleted_at);
create index if not exists rewards_owner_deleted_idx on public.rewards (owner_id, deleted_at);

create policy "settings_delete_own" on public.settings
for delete using (auth.uid() = owner_id and public.has_accepted_terms());

create or replace function public.is_feature_enabled_for_owner(
  p_owner_id uuid,
  p_feature_key text,
  p_default_enabled boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select pf.enabled
      from public.account_settings aset
      join public.plan_features pf
        on pf.plan = aset.plan
       and pf.feature_key = p_feature_key
      where aset.owner_id = p_owner_id
      limit 1
    ),
    (
      select ff.default_enabled
      from public.feature_flags ff
      where ff.key = p_feature_key
      limit 1
    ),
    p_default_enabled
  );
$$;

create or replace function public.enforce_plan_feature_limits()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  profiles_enabled boolean;
  tasks_enabled boolean;
  rewards_enabled boolean;
  existing_count integer;
begin
  if tg_table_name = 'profiles' then
    profiles_enabled := public.is_feature_enabled_for_owner(new.owner_id, 'profiles', true);
    if not profiles_enabled then
      select count(*)
      into existing_count
      from public.profiles
      where owner_id = new.owner_id
        and id <> new.id;

      if existing_count >= 1 then
        raise exception 'profile limit reached for current plan';
      end if;
    end if;
    return new;
  end if;

  if tg_table_name = 'tasks' then
    tasks_enabled := public.is_feature_enabled_for_owner(new.owner_id, 'tasks', true);
    if not tasks_enabled then
      select count(*)
      into existing_count
      from public.tasks
      where owner_id = new.owner_id
        and profile_id = new.profile_id
        and id <> new.id;

      if existing_count >= 10 then
        raise exception 'task limit reached for current plan';
      end if;
    end if;
    return new;
  end if;

  if tg_table_name = 'rewards' then
    rewards_enabled := public.is_feature_enabled_for_owner(new.owner_id, 'rewards', true);
    if not rewards_enabled then
      select count(*)
      into existing_count
      from public.rewards
      where owner_id = new.owner_id
        and profile_id = new.profile_id
        and id <> new.id;

      if existing_count >= 10 then
        raise exception 'reward limit reached for current plan';
      end if;

      new.limit_per_cycle := 1;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_plan_feature_limits_profiles on public.profiles;
create trigger enforce_plan_feature_limits_profiles
before insert or update on public.profiles
for each row execute function public.enforce_plan_feature_limits();

drop trigger if exists enforce_plan_feature_limits_tasks on public.tasks;
create trigger enforce_plan_feature_limits_tasks
before insert or update on public.tasks
for each row execute function public.enforce_plan_feature_limits();

drop trigger if exists enforce_plan_feature_limits_rewards on public.rewards;
create trigger enforce_plan_feature_limits_rewards
before insert or update on public.rewards
for each row execute function public.enforce_plan_feature_limits();

revoke all on function public.is_feature_enabled_for_owner(uuid, text, boolean) from public;
revoke all on function public.enforce_plan_feature_limits() from public;

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
