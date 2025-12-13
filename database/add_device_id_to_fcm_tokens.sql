-- Add device_id column to fcm_tokens table
ALTER TABLE `fcm_tokens` 
ADD COLUMN `device_id` VARCHAR(255) NULL AFTER `user_id`,
ADD INDEX `idx_fcm_device` (`device_id`);

-- Update existing rows to have a device_id (optional, for existing data)
-- This will set a placeholder device_id for existing tokens
-- UPDATE fcm_tokens SET device_id = CONCAT('legacy-', id) WHERE device_id IS NULL;
