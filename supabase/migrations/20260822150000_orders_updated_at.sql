-- Phase 5: Add updated_at to orders for status-change tracking

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
