-- Fix OTP column size to accommodate reset tokens
-- The OTP column needs to be larger to store reset tokens (64 characters)
-- This fixes the error: "Data too long for column 'otp' at row 1"

ALTER TABLE `password_reset_otps` 
MODIFY COLUMN `otp` VARCHAR(255) NOT NULL;

