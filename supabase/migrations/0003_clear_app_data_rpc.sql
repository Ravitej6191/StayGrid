-- Wraps "Clear App Data" in a single transaction so a failure partway
-- through (e.g. a dropped connection) can't leave the account half-wiped —
-- the previous client-side loop of 7 sequential deletes had no such
-- guarantee. Runs as the calling user (security invoker, the default),
-- so existing RLS policies still govern what it's allowed to touch.
create or replace function clear_app_data()
returns void
language plpgsql
as $$
declare
  v_building_id uuid;
begin
  select id into v_building_id from building where owner_id = auth.uid();
  if v_building_id is null then
    raise exception 'No building found for this account';
  end if;

  delete from floors where building_id = v_building_id;
  delete from tenants where building_id = v_building_id;
  delete from expenses where building_id = v_building_id;
  delete from inventory where building_id = v_building_id;
  delete from activities where building_id = v_building_id;
  delete from notifications where building_id = v_building_id;
  delete from broadcasts where building_id = v_building_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on new functions by default, but making
-- it explicit here means this works regardless of any project-level default
-- privilege changes on the Supabase side.
grant execute on function clear_app_data() to authenticated;
