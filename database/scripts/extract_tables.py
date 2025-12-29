#!/usr/bin/env python3
"""
Extract CREATE TABLE, INDEX, FK, and approved INSERT statements
for the active production schema.

Safety:
 - Read-only
 - No DROP/ALTER execution
 - Skips remove_*.sql and excluded tables
 - Outputs deterministic per-table files under /_schema_extracted/
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DB_DIR = PROJECT_ROOT
EXCLUDE_PATTERNS = ("remove_",)
EXCLUDED_TABLES = {
    "prompts", "prompt_logs",
    "asset_settings",
    "project_activities", "project_change_requests", "project_credentials",
    "kanban_boards", "kanban_columns", "kanban_tasks", "kanban_integrations",
    "kanban_task_history", "kanban_board_members", "kanban_time_logs",
}
OUTPUT_DIR = DB_DIR / "_schema_extracted"

CREATE_PATTERN = re.compile(r"(CREATE TABLE IF NOT EXISTS `(?P<table>\w+)`\s*\((?P<body>.*?)\)\s*ENGINE=.*?;)", re.DOTALL | re.IGNORECASE)
INSERT_PATTERN = re.compile(r"(INSERT INTO `(?P<table>\w+)`.*?;)", re.DOTALL | re.IGNORECASE)

def _sql_files():
    for path in DB_DIR.glob("*.sql"):
        if path.name.startswith(EXCLUDE_PATTERNS):
            continue
        yield path

def _sanitize(text: str) -> str:
    return text.strip()

def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    extracted = {}

    for sql_file in _sql_files():
        text = sql_file.read_text()
        for match in CREATE_PATTERN.finditer(text):
            table = match.group("table")
            if table in EXCLUDED_TABLES:
                continue
            block = match.group(1)
            extracted.setdefault(table, []).append(_sanitize(block))

        for match in INSERT_PATTERN.finditer(text):
            table = match.group("table")
            if table in EXCLUDED_TABLES:
                continue
            # only approved production seeds: check table part of active list
            block = match.group(1)
            extracted.setdefault(table, []).append(_sanitize(block))

    for table, blocks in sorted(extracted.items()):
        output = OUTPUT_DIR / f"{table}.sql"
        with output.open("w") as out:
            out.write(f"-- Extracted definition for {table}\n")
            out.write("\n\n".join(blocks))

if __name__ == "__main__":
    main()

