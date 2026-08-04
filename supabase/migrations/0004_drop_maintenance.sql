-- The maintenance/complaints feature was removed from the app — nothing in
-- the UI ever wrote to this table (the "Report an Issue" flow was pulled
-- earlier, before this table's data could ever be populated), so dropping
-- it is safe. bed_status keeps its 'maintenance' enum value (Postgres can't
-- drop enum values cheaply) but the app no longer uses or produces it.
drop table if exists maintenance;
drop type if exists maintenance_status;
drop type if exists maintenance_priority;
