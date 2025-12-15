-- Migration: Add unique constraints for mobile and aadhaar
-- Date: 2024

-- Add unique constraint to mobile column in users table
-- First, remove any duplicate mobile numbers (set to NULL if duplicates exist)
UPDATE users u1
INNER JOIN (
    SELECT mobile, COUNT(*) as cnt
    FROM users
    WHERE mobile IS NOT NULL AND mobile != ''
    GROUP BY mobile
    HAVING cnt > 1
) u2 ON u1.mobile = u2.mobile
SET u1.mobile = NULL
WHERE u1.id NOT IN (
    SELECT id FROM (
        SELECT MIN(id) as id
        FROM users
        WHERE mobile IS NOT NULL AND mobile != ''
        GROUP BY mobile
    ) AS temp
);

-- Add unique constraint to mobile column
ALTER TABLE `users` 
ADD UNIQUE INDEX `idx_user_mobile` (`mobile`);

-- Add unique constraint for Aadhaar document numbers
-- First, check if there are duplicate Aadhaar numbers (excluding NULL/empty)
-- Note: document_number is encrypted, so we need to handle this carefully
-- We'll add a unique constraint on (employee_id, document_type) to prevent duplicate Aadhaar per employee
-- And add a check constraint or trigger to prevent duplicate Aadhaar numbers across employees

-- Add unique constraint: one Aadhaar document per employee
ALTER TABLE `employee_documents`
ADD UNIQUE INDEX `idx_emp_doc_type_per_employee` (`employee_id`, `document_type`);

-- Note: Since document_number is encrypted, we cannot add a unique constraint directly on it
-- The application layer should handle checking for duplicate Aadhaar numbers before encryption
-- This is handled in the backend routes

