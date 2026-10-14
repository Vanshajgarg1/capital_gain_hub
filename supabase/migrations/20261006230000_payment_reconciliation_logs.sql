-- Create payment_reconciliation_logs table for manual admin review
-- Needed to durably record when a Razorpay payment is captured, but the local order
-- is either cancelled or expects a different amount, preventing automatic enrollment.

CREATE TABLE payment_reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    gateway_payment_id TEXT NOT NULL,
    gateway_order_id TEXT NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL,
    actual_amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    reason TEXT NOT NULL CHECK (reason IN ('AMOUNT_MISMATCH', 'CANCELLED_ORDER', 'OTHER')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'IGNORED')),
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a reconciliation log isn't created redundantly for the same payment
CREATE UNIQUE INDEX idx_reconciliation_gateway_payment
ON payment_reconciliation_logs(gateway_payment_id)
WHERE status = 'PENDING';

CREATE TRIGGER set_reconciliation_logs_updated_at
BEFORE UPDATE ON payment_reconciliation_logs
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE payment_reconciliation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reconciliation logs" ON payment_reconciliation_logs
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'ADMIN')
);

-- Service role needs access to insert from webhooks
GRANT ALL ON payment_reconciliation_logs TO service_role;
