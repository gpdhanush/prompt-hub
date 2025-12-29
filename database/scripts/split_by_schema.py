#!/usr/bin/env python3
"""
Group extracted tables into schema files respecting dependency order and line limits.

Outputs:
 - 00_schema_core.sql
 - 01_schema_project.sql
 - 02_schema_support.sql
 - 03_schema_misc.sql
 - 10_seed_production.sql

Assumes dependency_order.json exists.
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
EXTRA_DIR = PROJECT_ROOT / "_schema_extracted"
ORDER_FILE = PROJECT_ROOT / "_reports" / "dependency_order.json"
OUTPUT_FILES = {
    "core": PROJECT_ROOT / "schema" / "00_schema_core.sql",
    "project": PROJECT_ROOT / "schema" / "01_schema_project.sql",
    "support": PROJECT_ROOT / "schema" / "02_schema_support.sql",
    "misc": PROJECT_ROOT / "schema" / "03_schema_misc.sql",
    "seed": PROJECT_ROOT / "schema" / "10_seed_production.sql",
}

GROUPS = {
    "core": {"roles", "permissions", "role_permissions", "positions", "role_positions", "users", "password_history", "password_reset_otps", "refresh_tokens", "mfa_role_settings", "mfa_verification_attempts"},
    "project": {"projects", "project_users", "project_milestones", "project_files", "project_client_call_notes", "project_daily_status", "project_comments", "tasks", "task_comments", "task_history", "bugs", "bug_comments", "attachments", "timesheets"},
    "support": {"employees", "employee_documents", "attendance", "leaves", "reimbursements", "holidays", "asset_categories", "assets", "asset_laptop_details", "asset_mobile_details", "asset_accessory_details", "asset_assignments", "asset_tickets", "asset_ticket_comments", "asset_ticket_attachments", "asset_audit_logs", "asset_maintenance", "asset_approvals", "inventory_items", "inventory_transactions", "inventory_attachments"},
    "misc": {"notifications", "audit_logs", "settings", "fcm_tokens", "calendar_reminders"},
}

GROUP_ORDER = ["core", "project", "support", "misc"]
ALLOWED_SEED_TABLES = {"roles", "permissions", "role_permissions", "positions", "role_positions", "settings"}

LINE_LIMIT = 600
LOG_FILE = BASE_DIR / "split_by_schema.log"

def load_order():
    return json.loads(ORDER_FILE.read_text())

def split_statements(text):
    stmts = []
    buffer = []
    for char in text:
        buffer.append(char)
        if char == ";":
            stmt = "".join(buffer).strip()
            if stmt:
                stmts.append(stmt)
            buffer = []
    if buffer:
        trailing = "".join(buffer).strip()
        if trailing:
            stmts.append(trailing)
    return stmts

def is_ddl(statement):
    return statement.lstrip().upper().startswith("CREATE TABLE")

def is_insert(statement):
    return statement.lstrip().upper().startswith("INSERT INTO")

def write_group_content(group: str, table: str, content: str, group_contents: dict, group_lines: dict):
    lines = content.count("\n") + 1
    if group_lines[group] + lines > LINE_LIMIT:
        return False
    group_contents[group] += "\n\n" + content if group_contents[group] else content
    group_lines[group] += lines
    return True

def assign_group(table: str):
    for group, pool in GROUPS.items():
        if table in pool:
            return group
    return "misc"

def log_reassignment(table: str, from_group: str, to_group: str):
    with LOG_FILE.open("a") as log:
        log.write(f"Table {table} moved from {from_group} to {to_group}\n")

def prepare_group_files():
    for path in OUTPUT_FILES.values():
        path.write_text("")
    LOG_FILE.write_text("")

def append_seed(content: str, seeds: list):
    seeds.append(content)

def main():
    order = load_order()
    group_contents = {grp: "" for grp in GROUP_ORDER}
    group_lines = {grp: 0 for grp in GROUP_ORDER}
    seeds = []

    for table in order:
        path = EXTRA_DIR / f"{table}.sql"
        if not path.exists():
            continue
        statements = split_statements(path.read_text())
        ddl_statements = [stmt for stmt in statements if is_ddl(stmt)]
        insert_statements = [stmt for stmt in statements if is_insert(stmt)]
        if not ddl_statements:
            continue
        ddl_block = "\n\n".join(ddl_statements)
        target_group = assign_group(table)
        group_index = GROUP_ORDER.index(target_group)
        while group_index < len(GROUP_ORDER):
            current_group = GROUP_ORDER[group_index]
            if write_group_content(current_group, table, ddl_block, group_contents, group_lines):
                break
            if group_index + 1 >= len(GROUP_ORDER):
                raise SystemExit(f"Line limit reached for all groups while placing {table}")
            next_group = GROUP_ORDER[group_index + 1]
            with LOG_FILE.open("a") as log:
                log.write(f"Exceeded {LINE_LIMIT} lines in {current_group}, moving {table} to {next_group}\n")
            group_index += 1

        for insert_stmt in insert_statements:
            if table in ALLOWED_SEED_TABLES:
                append_seed(insert_stmt, seeds)

    for group, path in OUTPUT_FILES.items():
        if group == "seed":
            content = "-- Seed file (DDL stripped)\n" + "\n\n".join(seeds)
            path.write_text(content)
            continue
        if not group_contents[group]:
            path.write_text(f"-- {group} schema pending\n")
            continue
        path.write_text(group_contents[group])

if __name__ == "__main__":
    prepare_group_files()
    main()

if __name__ == "__main__":
    main()

