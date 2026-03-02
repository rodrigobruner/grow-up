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
