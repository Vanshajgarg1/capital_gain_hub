-- Phase 3: Add Razorpay Gateway Fields

-- Add gateway_order_id to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS gateway_order_id TEXT UNIQUE;

-- Add gateway_payment_id and gateway_signature to payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_signature TEXT;
