-- StayGrid initial schema — single-building PG/hostel/dorm/rental management.
-- MVP scope: one building per owner. owner_id ties every root table back to
-- auth.uid() for row level security; child tables inherit scope via FK joins.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type property_type as enum ('pg', 'co_living', 'building', 'residency', 'apartment');
create type room_type as enum (
  'single', 'twin', 'sharing_3', 'sharing_4', 'sharing_5', 'sharing_6', 'sharing_7', 'sharing_8', 'dorm'
);
create type bed_status as enum ('vacant', 'occupied', 'maintenance');
create type tenant_status as enum ('active', 'vacated');
create type rent_status as enum ('paid', 'partial', 'pending', 'advance');
create type payment_mode as enum ('cash', 'upi', 'bank_transfer', 'cheque');
create type expense_category as enum (
  'food', 'groceries', 'milk', 'vegetables', 'gas', 'electricity',
  'internet', 'cleaning', 'repairs', 'furniture', 'salary', 'misc'
);
create type maintenance_priority as enum ('low', 'medium', 'high', 'urgent');
create type maintenance_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type inventory_category as enum (
  'kitchen', 'furniture', 'cleaning', 'appliances', 'gas_cylinders',
  'mattresses', 'beds', 'fans', 'buckets', 'water_cans', 'misc'
);

-- ---------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- building (single row per owner in MVP)
-- ---------------------------------------------------------------------
create table building (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  property_type property_type not null default 'pg',
  address text,
  city text,
  state text,
  pincode text,
  contact_phone text,
  contact_email text,
  gst_number text,
  pan_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index building_owner_unique on building(owner_id);
create trigger building_set_updated_at before update on building
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- floors
-- ---------------------------------------------------------------------
create table floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references building(id) on delete cascade,
  floor_number int not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (building_id, floor_number)
);

-- ---------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------
create table rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  room_number text not null,
  room_type room_type not null default 'single',
  capacity int not null default 1,
  attached_bathroom boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_id, room_number)
);
create trigger rooms_set_updated_at before update on rooms
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- beds
-- ---------------------------------------------------------------------
create table beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  bed_label text not null,
  status bed_status not null default 'vacant',
  created_at timestamptz not null default now(),
  unique (room_id, bed_label)
);

-- ---------------------------------------------------------------------
-- tenants (at most one active tenant per bed)
-- ---------------------------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references building(id) on delete cascade,
  bed_id uuid references beds(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  aadhaar_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  address text,
  occupation text,
  company text,
  blood_group text,
  photo_url text,
  joining_date date not null default current_date,
  vacating_date date,
  advance numeric(10, 2) not null default 0,
  deposit numeric(10, 2) not null default 0,
  rent numeric(10, 2) not null default 0,
  rent_status rent_status not null default 'pending',
  status tenant_status not null default 'active',
  notes text,
  deposit_paid_amount numeric(10, 2),
  deposit_paid_date date,
  deposit_screenshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tenants_one_active_per_bed on tenants(bed_id)
  where status = 'active' and bed_id is not null;
create trigger tenants_set_updated_at before update on tenants
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  amount numeric(10, 2) not null,
  payment_date date not null default current_date,
  payment_mode payment_mode not null default 'cash',
  for_month date not null,
  late_fee numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  status rent_status not null default 'paid',
  receipt_number text,
  receipt_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references building(id) on delete cascade,
  category expense_category not null,
  amount numeric(10, 2) not null,
  expense_date date not null default current_date,
  description text,
  invoice_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- maintenance
-- ---------------------------------------------------------------------
create table maintenance (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  description text,
  priority maintenance_priority not null default 'medium',
  status maintenance_status not null default 'open',
  vendor_name text,
  cost numeric(10, 2),
  invoice_url text,
  photos text[] not null default '{}',
  completion_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger maintenance_set_updated_at before update on maintenance
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------
create table inventory (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references building(id) on delete cascade,
  category inventory_category not null,
  item_name text not null,
  quantity int not null default 0,
  low_stock_threshold int not null default 1,
  unit text not null default 'pcs',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger inventory_set_updated_at before update on inventory
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  doc_type text not null,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- activities (append-only feed for the dashboard timeline)
-- ---------------------------------------------------------------------
create table activities (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references building(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  activity_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- notifications (event-sourced feed backing the bell icon)
-- ---------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references building(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- broadcasts (WhatsApp broadcast send history)
-- ---------------------------------------------------------------------
create table broadcasts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references building(id) on delete cascade,
  message text not null,
  image_url text,
  audience text not null,
  recipient_count int not null default 0,
  delivered_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- settings (one row per owner)
-- ---------------------------------------------------------------------
create table settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_name text,
  onboarding_completed boolean not null default false,
  theme text not null default 'system',
  notifications_enabled boolean not null default true,
  rent_reminder_days_before int not null default 3,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index settings_owner_unique on settings(owner_id);
create trigger settings_set_updated_at before update on settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — every row is reachable only by its owner, via a
-- join back to building.owner_id (or settings.owner_id / building
-- directly for root tables).
-- ---------------------------------------------------------------------
alter table building enable row level security;
alter table floors enable row level security;
alter table rooms enable row level security;
alter table beds enable row level security;
alter table tenants enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table maintenance enable row level security;
alter table inventory enable row level security;
alter table documents enable row level security;
alter table activities enable row level security;
alter table notifications enable row level security;
alter table broadcasts enable row level security;
alter table settings enable row level security;

create policy building_owner_all on building
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy floors_owner_all on floors
  for all using (
    exists (select 1 from building b where b.id = floors.building_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from building b where b.id = floors.building_id and b.owner_id = auth.uid())
  );

create policy rooms_owner_all on rooms
  for all using (
    exists (
      select 1 from floors f join building b on b.id = f.building_id
      where f.id = rooms.floor_id and b.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from floors f join building b on b.id = f.building_id
      where f.id = rooms.floor_id and b.owner_id = auth.uid()
    )
  );

create policy beds_owner_all on beds
  for all using (
    exists (
      select 1 from rooms r join floors f on f.id = r.floor_id join building b on b.id = f.building_id
      where r.id = beds.room_id and b.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from rooms r join floors f on f.id = r.floor_id join building b on b.id = f.building_id
      where r.id = beds.room_id and b.owner_id = auth.uid()
    )
  );

create policy tenants_owner_all on tenants
  for all using (
    exists (select 1 from building b where b.id = tenants.building_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from building b where b.id = tenants.building_id and b.owner_id = auth.uid())
  );

create policy payments_owner_all on payments
  for all using (
    exists (
      select 1 from tenants t join building b on b.id = t.building_id
      where t.id = payments.tenant_id and b.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from tenants t join building b on b.id = t.building_id
      where t.id = payments.tenant_id and b.owner_id = auth.uid()
    )
  );

create policy expenses_owner_all on expenses
  for all using (
    exists (select 1 from building b where b.id = expenses.building_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from building b where b.id = expenses.building_id and b.owner_id = auth.uid())
  );

create policy maintenance_owner_all on maintenance
  for all using (
    exists (
      select 1 from rooms r join floors f on f.id = r.floor_id join building b on b.id = f.building_id
      where r.id = maintenance.room_id and b.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from rooms r join floors f on f.id = r.floor_id join building b on b.id = f.building_id
      where r.id = maintenance.room_id and b.owner_id = auth.uid()
    )
  );

create policy inventory_owner_all on inventory
  for all using (
    exists (select 1 from building b where b.id = inventory.building_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from building b where b.id = inventory.building_id and b.owner_id = auth.uid())
  );

create policy documents_owner_all on documents
  for all using (
    exists (
      select 1 from tenants t join building b on b.id = t.building_id
      where t.id = documents.tenant_id and b.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from tenants t join building b on b.id = t.building_id
      where t.id = documents.tenant_id and b.owner_id = auth.uid()
    )
  );

create policy activities_owner_all on activities
  for all using (
    exists (select 1 from building b where b.id = activities.building_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from building b where b.id = activities.building_id and b.owner_id = auth.uid())
  );

create policy notifications_owner_all on notifications
  for all using (
    exists (select 1 from building b where b.id = notifications.building_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from building b where b.id = notifications.building_id and b.owner_id = auth.uid())
  );

create policy broadcasts_owner_all on broadcasts
  for all using (
    exists (select 1 from building b where b.id = broadcasts.building_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from building b where b.id = broadcasts.building_id and b.owner_id = auth.uid())
  );

create policy settings_owner_all on settings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- Storage — tenant photos and deposit screenshots. Uploaded to
-- `<owner_id>/<folder>/<file>` so a simple path-prefix check scopes every
-- read/write to the uploading owner. Bucket is public (public URLs are
-- returned to the client) since these are non-sensitive display images;
-- switch to signed URLs if that changes.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tenant-uploads', 'tenant-uploads', true)
on conflict (id) do nothing;

create policy tenant_uploads_owner_all on storage.objects
  for all using (
    bucket_id = 'tenant-uploads' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'tenant-uploads' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- Indexes for common lookups
-- ---------------------------------------------------------------------
create index floors_building_id_idx on floors(building_id);
create index rooms_floor_id_idx on rooms(floor_id);
create index beds_room_id_idx on beds(room_id);
create index tenants_bed_id_idx on tenants(bed_id);
create index tenants_building_id_idx on tenants(building_id);
create index payments_tenant_id_idx on payments(tenant_id);
create index expenses_building_id_idx on expenses(building_id);
create index maintenance_room_id_idx on maintenance(room_id);
create index inventory_building_id_idx on inventory(building_id);
create index documents_tenant_id_idx on documents(tenant_id);
create index activities_building_id_idx on activities(building_id);
create index notifications_building_id_idx on notifications(building_id);
create index broadcasts_building_id_idx on broadcasts(building_id);
