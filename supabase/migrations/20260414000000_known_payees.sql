-- Known Payees: reusable payee entities scoped to a user
CREATE TABLE known_payees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_name text NOT NULL,
  nickname text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_known_payees_user_id ON known_payees(user_id);

-- Aliases: case-insensitive name patterns for matching
CREATE TABLE known_payee_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  known_payee_id uuid NOT NULL REFERENCES known_payees(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_alias_per_payee UNIQUE (known_payee_id, alias)
);

CREATE INDEX idx_known_payee_aliases_known_payee_id ON known_payee_aliases(known_payee_id);
CREATE INDEX idx_known_payee_aliases_alias ON known_payee_aliases(alias);

-- Banking details: multiple verified sets per known payee
CREATE TABLE known_payee_banking_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  known_payee_id uuid NOT NULL REFERENCES known_payees(id) ON DELETE CASCADE,
  country text NOT NULL DEFAULT 'US',
  aba_routing_number text,
  account_number text,
  transit_number text,
  institution_number text,
  bank_name text,
  account_type text,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_known_payee_banking_known_payee_id ON known_payee_banking_details(known_payee_id);

-- Composite indexes for banking match lookups
CREATE INDEX idx_known_payee_banking_us
  ON known_payee_banking_details(aba_routing_number, account_number)
  WHERE aba_routing_number IS NOT NULL AND account_number IS NOT NULL;

CREATE INDEX idx_known_payee_banking_ca
  ON known_payee_banking_details(transit_number, institution_number, account_number)
  WHERE transit_number IS NOT NULL AND institution_number IS NOT NULL AND account_number IS NOT NULL;

-- Link payees (per-invoice) to known payees
ALTER TABLE payees ADD COLUMN known_payee_id uuid REFERENCES known_payees(id) ON DELETE SET NULL;
ALTER TABLE payees ADD COLUMN match_result jsonb;
