-- Add international banking columns to payees table
ALTER TABLE payees ADD COLUMN payment_rail text;
ALTER TABLE payees ADD COLUMN swift_code text;
ALTER TABLE payees ADD COLUMN iban text;
ALTER TABLE payees ADD COLUMN sort_code text;
ALTER TABLE payees ADD COLUMN intermediary_bank_detected boolean DEFAULT false;

-- Add international banking columns to known_payee_banking_details
ALTER TABLE known_payee_banking_details ADD COLUMN payment_rail text;
ALTER TABLE known_payee_banking_details ADD COLUMN swift_code text;
ALTER TABLE known_payee_banking_details ADD COLUMN iban text;
ALTER TABLE known_payee_banking_details ADD COLUMN sort_code text;

-- Indexes for international matching
CREATE INDEX idx_kpbd_iban ON known_payee_banking_details(iban) WHERE iban IS NOT NULL;
CREATE INDEX idx_kpbd_swift ON known_payee_banking_details(swift_code, account_number) WHERE swift_code IS NOT NULL AND account_number IS NOT NULL;
CREATE INDEX idx_kpbd_bacs ON known_payee_banking_details(sort_code, account_number) WHERE sort_code IS NOT NULL AND account_number IS NOT NULL;

-- Backfill existing data
UPDATE payees SET payment_rail = 'ach' WHERE country = 'US' AND payment_rail IS NULL;
UPDATE payees SET payment_rail = 'eft' WHERE country = 'CA' AND payment_rail IS NULL;
UPDATE known_payee_banking_details SET payment_rail = 'ach' WHERE country = 'US' AND payment_rail IS NULL;
UPDATE known_payee_banking_details SET payment_rail = 'eft' WHERE country = 'CA' AND payment_rail IS NULL;
