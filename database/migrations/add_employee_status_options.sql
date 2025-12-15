-- Migration: Add Resigned and Terminated to employee_status ENUM
-- Date: 2024
-- Description: Extends employee_status ENUM to include Resigned and Terminated options

USE `admin_dashboard`;

-- Modify the employee_status ENUM to include new options
ALTER TABLE `employees` 
MODIFY COLUMN `employee_status` ENUM('Active', 'Inactive', 'Resigned', 'Terminated') DEFAULT 'Active';

