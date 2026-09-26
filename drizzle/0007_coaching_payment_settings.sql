CREATE TABLE "coaching_payment_settings" (
  "id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
  "merchant_number" text NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "coaching_payment_settings_singleton_check" CHECK ("id" = 1),
  CONSTRAINT "coaching_payment_settings_number_check" CHECK (length(trim("merchant_number")) BETWEEN 5 AND 25)
);
