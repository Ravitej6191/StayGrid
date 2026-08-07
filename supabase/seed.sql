-- Demo seed data — mirrors the shape of src/lib/demo-store.ts so a freshly
-- connected Supabase project looks the same as demo mode.
-- Run after 0001_init.sql, against a project that already has at least one
-- auth.users row (sign up once via the app, then run this script).

do $$
declare
  v_owner_id uuid;
  v_building_id uuid;
  v_floor_ground uuid;
  v_floor_first uuid;
  v_house_g1 uuid;
  v_house_g2 uuid;
  v_house_101 uuid;
  v_house_102 uuid;
  v_tenant_1 uuid;
  v_tenant_2 uuid;
  v_tenant_3 uuid;
begin
  select id into v_owner_id from auth.users order by created_at asc limit 1;

  if v_owner_id is null then
    raise notice 'No auth.users found — sign up in the app first, then re-run this seed.';
    return;
  end if;

  insert into building (owner_id, name, property_type, address, city, state, pincode, contact_phone, contact_email)
  values (v_owner_id, 'Sunrise PG', 'pg', '12 MG Road', 'Bengaluru', 'Karnataka', '560001', '+91 90000 00000', 'owner@sunrisepg.example')
  returning id into v_building_id;

  insert into floors (building_id, floor_number, name) values (v_building_id, 0, 'Ground Floor') returning id into v_floor_ground;
  insert into floors (building_id, floor_number, name) values (v_building_id, 1, 'First Floor') returning id into v_floor_first;

  insert into houses (floor_id, house_number, house_type, attached_bathroom)
  values (v_floor_ground, 'G1', '2bhk', true)
  returning id into v_house_g1;

  insert into houses (floor_id, house_number, house_type, attached_bathroom)
  values (v_floor_ground, 'G2', '1bhk', true)
  returning id into v_house_g2;

  insert into houses (floor_id, house_number, house_type, attached_bathroom)
  values (v_floor_first, '101', '2bhk', true)
  returning id into v_house_101;

  insert into houses (floor_id, house_number, house_type, attached_bathroom)
  values (v_floor_first, '102', '3bhk', false)
  returning id into v_house_102;

  insert into tenants (house_id, name, phone, aadhaar_number, occupation, joining_date, advance, deposit, rent, rent_status, status)
  values (v_house_g1, 'Ananya Sharma', '+91 98765 43210', 'XXXX-XXXX-4821', 'Software Engineer', current_date - interval '4 months', 9000, 18000, 9000, 'paid', 'active')
  returning id into v_tenant_1;

  insert into tenants (house_id, name, phone, aadhaar_number, occupation, joining_date, advance, deposit, rent, rent_status, status)
  values (v_house_101, 'Rohit Verma', '+91 91234 56780', 'XXXX-XXXX-7734', 'Marketing Executive', current_date - interval '2 months', 9500, 19000, 9500, 'pending', 'active')
  returning id into v_tenant_2;

  insert into tenants (house_id, name, phone, occupation, joining_date, advance, deposit, rent, rent_status, status)
  values (v_house_102, 'Kavya Nair', '+91 99887 66554', 'Student', current_date - interval '1 month', 9500, 19000, 9500, 'partial', 'active')
  returning id into v_tenant_3;

  insert into payments (tenant_id, amount, payment_date, payment_mode, for_month, status, receipt_number)
  values
    (v_tenant_1, 9000, current_date - interval '2 days', 'upi', date_trunc('month', current_date), 'paid', 'RCPT-0001'),
    (v_tenant_1, 9000, current_date - interval '1 month', 'upi', date_trunc('month', current_date - interval '1 month'), 'paid', 'RCPT-0000'),
    (v_tenant_2, 5000, current_date - interval '10 days', 'cash', date_trunc('month', current_date), 'partial', 'RCPT-0002');

  insert into expenses (building_id, category, amount, expense_date, description)
  values
    (v_building_id, 'groceries', 4200, current_date - interval '3 days', 'Monthly groceries'),
    (v_building_id, 'electricity', 6800, current_date - interval '6 days', 'EB bill'),
    (v_building_id, 'internet', 1200, current_date - interval '10 days', 'Broadband'),
    (v_building_id, 'salary', 12000, current_date - interval '1 days', 'Cook salary');

  insert into inventory (building_id, category, item_name, quantity, low_stock_threshold, unit)
  values
    (v_building_id, 'kitchen', 'LPG Cylinders', 2, 1, 'pcs'),
    (v_building_id, 'cleaning', 'Phenyl (5L)', 1, 2, 'bottles'),
    (v_building_id, 'furniture', 'Study Chairs', 9, 2, 'pcs');

  insert into activities (building_id, entity_type, entity_id, activity_type, description)
  values
    (v_building_id, 'tenant', v_tenant_2, 'tenant_joined', 'Rohit Verma joined House 101'),
    (v_building_id, 'payment', v_tenant_1, 'rent_paid', 'Ananya Sharma paid rent for this month');

  insert into settings (owner_id, owner_name, onboarding_completed) values (v_owner_id, 'Demo Owner', true)
  on conflict (owner_id) do nothing;
end $$;
