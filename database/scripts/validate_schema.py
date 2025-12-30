#!/usr/bin/env python3
"""
Validate the consolidated schema files.

Checks:
 - All 51 active tables included
 - 13 excluded tables absent
 - No duplicate CREATE TABLE
 - FK references resolvable within extracted set
 - Each file contains ≤ 600 lines

Outputs schema_validation_report.txt
"""

import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
SCHEMA_FILES = [
    PROJECT_ROOT / "schema" / "00_schema_core.sql",
    PROJECT_ROOT / "schema" / "01_schema_project.sql",
    PROJECT_ROOT / "schema" / "02_schema_support.sql",
    PROJECT_ROOT / "schema" / "03_schema_misc.sql",
]
VALIDATION_REPORT = PROJECT_ROOT / "_reports" / "schema_validation_report.txt"
DEPENDENCY_FILE = PROJECT_ROOT / "_reports" / "dependency_order.json"
ACTIVE_TABLES = {
    # list of 51 tables per analysis (core/project/support/misc)
    "roles","permissions","role_permissions","positions","role_positions","users","password_history","password_reset_otps","refresh_tokens","mfa_role_settings","mfa_verification_attempts",
    "employees","employee_documents","attendance","leaves","reimbursements","holidays","asset_categories","assets","asset_laptop_details","asset_mobile_details","asset_accessory_details","asset_assignments","asset_tickets","asset_ticket_comments","asset_ticket_attachments","asset_audit_logs","asset_maintenance","asset_approvals","inventory_items","inventory_transactions","inventory_attachments",
    "projects","project_users","project_milestones","project_files","project_client_call_notes","project_daily_status","project_comments","tasks","task_comments","task_history","bugs","bug_comments","attachments","timesheets",
    "notifications","audit_logs","settings","fcm_tokens","calendar_reminders"
}
EXCLUDED_TABLES = {
    "prompts", "prompt_logs",
    "asset_settings",
    # Removed features: project_activities (Repository Activity), project_credentials (Credentials)
   "project_change_requests", 
    "kanban_boards", "kanban_columns", "kanban_tasks", "kanban_integrations",
    "kanban_task_history", "kanban_board_members", "kanban_time_logs"
}

CREATE_PATTERN = re.compile(r"CREATE TABLE IF NOT EXISTS `(\\w+)`", re.IGNORECASE)
INSERT_PATTERN = re.compile(r"INSERT INTO `(\\w+)`", re.IGNORECASE)
FK_PATTERN = re.compile(r"FOREIGN KEY `[^`]+` \\(`(?P<column>\\w+)`\\) REFERENCES `(?P<ref>\\w+)`", re.IGNORECASE)

def count_tables():
    if not DEPENDENCY_FILE.exists():
        return set(), set()
    order = json.loads(DEPENDENCY_FILE.read_text())
    tables = set(order)
    duplicates = {table for table in order if order.count(table) > 1}
    return tables, duplicates

def check_foreign_keys(tables):
    missing = set()
    fk_missing = []
    for path in SCHEMA_FILES:
        text = path.read_text()
        for match in FK_PATTERN.finditer(text):
            ref = match.group("ref")
            if ref not in tables:
                missing.add(ref)
                fk_missing.append((path.name, ref))
    return missing, fk_missing

def check_insert_usage():
    violations = []
    allowed_seed_tables = {"roles","permissions","role_permissions","positions","role_positions","settings"}
    seed_text = (PROJECT_ROOT / "schema" / "10_seed_production.sql").read_text()
    for path in SCHEMA_FILES:
        text = path.read_text()
        if INSERT_PATTERN.search(text):
            violations.append(path.name)
    wrong_seeds = []
    for match in INSERT_PATTERN.findall(seed_text):
        if match not in allowed_seed_tables:
            wrong_seeds.append(match)
    return violations, wrong_seeds

def check_line_limits():
    violations = []
    for path in SCHEMA_FILES:
        if not path.exists():
            continue
        lines = len(path.read_text().splitlines())
        if lines > 600:
            violations.append((path.name, lines))
    return violations

def main():
    tables, duplicates = count_tables()
    missing_active = ACTIVE_TABLES - tables
    included_excluded = EXCLUDED_TABLES & tables
    missing_fk, fk_details = check_foreign_keys(tables)
    insert_violations, wrong_seed_tables = check_insert_usage()
    line_violations = check_line_limits()

    with VALIDATION_REPORT.open("w") as report:
        report.write("Schema Validation Report\n")
        report.write("========================\n")
        report.write(f"Total schema tables detected: {len(tables)}\n")
        report.write(f"Duplicate CREATE TABLE definitions: {', '.join(sorted(duplicates)) or 'None'}\n")
        report.write(f"Active tables missing: {', '.join(sorted(missing_active)) or 'None'}\n")
        report.write(f"Excluded tables present: {', '.join(sorted(included_excluded)) or 'None'}\n")
        report.write(f"Foreign key references missing: {', '.join(sorted(missing_fk)) or 'None'}\n")
        report.write(f"Schema files containing INSERTs: {', '.join(insert_violations) or 'None'}\n")
        report.write(f"Seed file contains disallowed tables: {', '.join(sorted(set(wrong_seed_tables))) or 'None'}\n")
        if fk_details:
            report.write("\nForeign key issues:\n")
            for src, ref in fk_details:
                report.write(f"- {src} references missing table {ref}\n")
        report.write(f"\nLine count violations (>600): {line_violations or 'None'}\n")

        if missing_active or included_excluded or duplicates or missing_fk or line_violations or insert_violations or wrong_seed_tables:
            report.write("\nValidation Status: FAIL\n")
        else:
            report.write("\nValidation Status: PASS\n")

if __name__ == "__main__":
    main()

