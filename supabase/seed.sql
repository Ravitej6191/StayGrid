-- Demo seed data — mirrors the shape of src/features/*/services/*.mock.ts
-- so a freshly connected Supabase project looks the same as demo mode.
-- Run after 0001_init.sql, against a project that already has at least one
-- auth.users row (sign up once via the app, then run this script).

do $$
declare
  v_owner_id uuid;
  v_building_id uuid;
  v_floor_ground uuid;
  v_floor_first uuid;
  v_room_g1 uuid;
  v_room_g2 uuid;
  v_room_101 uuid;
  v_room_102 uuid;
  v_bed_g1_a uuid;
  v_bed_g1_b uuid;
  v_bed_101_a uuid;
  v_bed_101_b uuid;
  v_tenant_1 uuid;
  v_tenant_2 uuid;
begin
  select id into v_owner_id from auth.users order by created_at asc limit 1;

  if v_owner_id is null then
    raise notice 'No auth.users found — sign up in the app first, then re-run this seed.';
    return;
  end if;

  insert into building (owner_id, name, property_type, address, city, state, pincode, contact_phone, contact_email, gst_number, pan_number)
  values (v_owner_id, 'Sunrise PG', 'pg', '12 MG Road', 'Bengaluru', 'Karnataka', '560001', '+91 90000 00000', 'owner@sunrisepg.example', '29ABCDE1234F1Z5', 'ABCDE1234F')
  returning id into v_building_id;

  insert into floors (building_id, floor_number, name) values (v_building_id, 0, 'Ground Floor') returning id into v_floor_ground;
  insert into floors (building_id, floor_number, name) values (v_building_id, 1, 'First Floor') returning id into v_floor_first;

  insert into rooms (floor_id, room_number, room_type, capacity, rent, deposit, attached_bathroom, has_ac, has_wifi, amenities)
  values (v_floor_ground, 'G1', 'double', 2, 9000, 18000, true, true, true, array['Study Table', 'Wardrobe'])
  returning id into v_room_g1;

  insert into rooms (floor_id, room_number, room_type, capacity, rent, deposit, attached_bathroom, has_ac, has_wifi, amenities)
  values (v_floor_ground, 'G2', 'single', 1, 11000, 22000, true, false, true, array['Study Table'])
  returning id into v_room_g2;

  insert into rooms (floor_id, room_number, room_type, capacity, rent, deposit, attached_bathroom, has_ac, has_wifi, amenities)
  values (v_floor_first, '101', 'double', 2, 9500, 19000, true, true, true, array['Study Table', 'Wardrobe', 'Balcony'])
  returning id into v_room_101;

  insert into rooms (floor_id, room_number, room_type, capacity, rent, deposit, attached_bathroom, has_ac, has_wifi, amenities)
  values (v_floor_first, '102', 'triple', 3, 8000, 16000, false, false, true, array['Study Table'])
  returning id into v_room_102;

  insert into beds (room_id, bed_label, status) values (v_room_g1, 'A', 'occupied') returning id into v_bed_g1_a;
  insert into beds (room_id, bed_label, status) values (v_room_g1, 'B', 'vacant') returning id into v_bed_g1_b;
  insert into beds (room_id, bed_label, status) values (v_room_g2, 'A', 'maintenance');
  insert into beds (room_id, bed_label, status) values (v_room_101, 'A', 'occupied') returning id into v_bed_101_a;
  insert into beds (room_id, bed_label, status) values (v_room_101, 'B', 'occupied') returning id into v_bed_101_b;
  insert into beds (room_id, bed_label, status) values (v_room_102, 'A', 'vacant');
  insert into beds (room_id, bed_label, status) values (v_room_102, 'B', 'vacant');
  insert into beds (room_id, bed_label, status) values (v_room_102, 'C', 'vacant');

  insert into tenants (bed_id, name, phone, email, aadhaar_number, emergency_contact_name, emergency_contact_phone, occupation, company, joining_date, advance, deposit, rent, rent_status, status)
  values (v_bed_g1_a, 'Ananya Sharma', '+91 98765 43210', 'ananya.sharma@example.com', 'XXXX-XXXX-4821', 'Ramesh Sharma', '+91 98765 11111', 'Software Engineer', 'Innotech Pvt Ltd', current_date - interval '4 months', 9000, 18000, 9000, 'paid', 'active')
  returning id into v_tenant_1;

  insert into tenants (bed_id, name, phone, email, aadhaar_number, occupation, company, joining_date, advance, deposit, rent, rent_status, status)
  values (v_bed_101_a, 'Rohit Verma', '+91 91234 56780', 'rohit.verma@example.com', 'XXXX-XXXX-7734', 'Marketing Executive', 'BrightAds', current_date - interval '2 months', 9500, 19000, 9500, 'pending', 'active')
  returning id into v_tenant_2;

  insert into tenants (bed_id, name, phone, email, occupation, joining_date, advance, deposit, rent, rent_status, status)
  values (v_bed_101_b, 'Kavya Nair', '+91 99887 66554', 'kavya.nair@example.com', 'Student', current_date - interval '1 month', 9500, 19000, 9500, 'partial', 'active');

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

  insert into maintenance (room_id, title, description, priority, status, vendor_name, cost)
  values (v_room_g2, 'AC not cooling', 'Bed A room AC needs gas refill', 'high', 'in_progress', 'CoolFix Services', 1800);

  insert into inventory (building_id, category, item_name, quantity, low_stock_threshold, unit)
  values
    (v_building_id, 'kitchen', 'LPG Cylinders', 2, 1, 'pcs'),
    (v_building_id, 'cleaning', 'Phenyl (5L)', 1, 2, 'bottles'),
    (v_building_id, 'furniture', 'Study Chairs', 9, 2, 'pcs');

  insert into activities (building_id, entity_type, entity_id, activity_type, description)
  values
    (v_building_id, 'tenant', v_tenant_2, 'tenant_joined', 'Rohit Verma joined Room 101 - Bed A'),
    (v_building_id, 'payment', v_tenant_1, 'rent_paid', 'Ananya Sharma paid rent for this month'),
    (v_building_id, 'maintenance', v_room_g2, 'maintenance_created', 'Maintenance request raised for Room G2');

  insert into settings (owner_id, owner_name, onboarding_completed) values (v_owner_id, 'Demo Owner', true)
  on conflict (owner_id) do nothing;
end $$;
