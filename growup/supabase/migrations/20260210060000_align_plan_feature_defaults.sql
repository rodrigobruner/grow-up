-- Align default feature availability per plan with product rules shown in Admin UI.
-- FREE: no advanced features
-- BETA: advanced tasks + rewards, single profile
-- PRO/DEV: all enabled

insert into public.plan_features (plan, feature_key, enabled)
values
  ('FREE', 'tasks', false),
  ('FREE', 'rewards', false),
  ('FREE', 'profiles', false),
  ('BETA', 'tasks', true),
  ('BETA', 'rewards', true),
  ('BETA', 'profiles', false),
  ('PRO', 'tasks', true),
  ('PRO', 'rewards', true),
  ('PRO', 'profiles', true),
  ('DEV', 'tasks', true),
  ('DEV', 'rewards', true),
  ('DEV', 'profiles', true)
on conflict (plan, feature_key)
do update set
  enabled = excluded.enabled,
  updated_at = now();
