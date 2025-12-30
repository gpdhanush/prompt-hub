-- Migration to remove Repository Activity and Credentials features
-- This migration drops the project_activities and project_credentials tables

-- Drop project_activities table (Repository Activity feature)
DROP TABLE IF EXISTS `project_activities`;

-- Drop project_credentials table (Credentials feature)
DROP TABLE IF EXISTS `project_credentials`;

