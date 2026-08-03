-- Tracks the actual moment a deposit was recorded, separate from
-- deposit_paid_date (a plain calendar date the owner can backdate). Mirrors
-- payments.created_at / expenses.created_at, which already serve this role
-- for those record types.
alter table tenants add column deposit_recorded_at timestamptz;
