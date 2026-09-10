ALTER TABLE payments
ADD CONSTRAINT unique_gateway_payment_id
UNIQUE (gateway_payment_id);
