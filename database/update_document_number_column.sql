-- Migration script to update document_number column to support encrypted data
-- Encrypted data is significantly longer than plain text, so we need TEXT column

-- Run this script to update existing database schema
-- This will allow storing encrypted document numbers

ALTER TABLE `employee_documents` 
  MODIFY COLUMN `document_number` TEXT;

-- Note: After running this migration, existing plain text data will need to be encrypted
-- You may want to create a script to encrypt existing data if you have any
