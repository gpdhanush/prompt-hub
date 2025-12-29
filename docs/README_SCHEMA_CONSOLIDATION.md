# Schema Consolidation Playbook

## Purpose

This set of scripts orchestrates the consolidation of the production schema:
- Extract each active table's SQL definition from the legacy migration files
- Analyze foreign key dependencies
- Split definitions into structured schema files with size limits
- Validate the final schema set before manual deployment

All scripts are **read-only** and designed for DBA review/execution. No SQL is executed automatically.

## Execution Order (per step)

1. **Extraction:**  
   `python3 extract_tables.py`  
   Scans `/database`, extracts CREATE TABLE + indexes + FKs + approved INSERT seeds, and writes `/ _schema_extracted/<table>.sql`.

2. **Dependency Resolution:**  
   `python3 resolve_dependencies.py`  
   Parses extracted tables and builds `dependency_order.json` + `dependency_report.txt`. Detects cycles explicitly.

3. **Schema Splitting:**  
   `python3 split_by_schema.py`  
   Uses `dependency_order.json`, groups tables into core/project/support/misc files, enforces ≤ 600 lines, writes schema files and `10_seed_production.sql`.

4. **Validation:**  
   `python3 validate_schema.py`  
   Validates all 51 active tables are included, excludes flagged tables, checks FK resolvability and line limits, outputs `schema_validation_report.txt`.

5. **Documentation & Review:**  
   Review `database/SCHEMA_CONSOLIDATION_FINAL_REPORT.md` and `database/SCHEMA_CONSOLIDATION_STATUS.md` before handoff.

## Safety Notes

- No script modifies the original SQL files.
- No DROP/ALTER statements are executed.
- Excluded tables (`prompts`, `prompt_logs`, `asset_settings`, `project_activities`, `project_change_requests`, `project_credentials`, `kanban_*`) are never extracted.
- Each script writes deterministic outputs for DBA review.
- File size constraints (≤600 lines) are enforced by `split_by_schema.py`; violations stop execution.

## DBA Handoff Steps

1. Run scripts in sequence on a staging clone of the repository.
2. Inspect `_schema_extracted/` files for each table to ensure accuracy.
3. Review `dependency_order.json` and `dependency_report.txt` for ordering and cycles.
4. After splitting, manually inspect each schema file (00..03) to confirm completeness.
5. Run `validate_schema.py` — ensure it reports PASS.
6. Seed data is collected in `10_seed_production.sql`; review for required values.
7. Once verified, transfer schema files and manual execution plan to production DBA.

## Example Command Sequence (Dry Run)

```bash
cd /path/to/prompt-hub
# 1. Extract table definitions
python3 extract_tables.py

# 2. Resolve FK dependencies
python3 resolve_dependencies.py

# 3. Split into schema files
python3 split_by_schema.py

# 4. Validate assembled schema
python3 validate_schema.py

# 5. Review reports
less dependency_report.txt
less schema_validation_report.txt
```

Run each step manually; review outputs before proceeding. This workflow is intended for manual DBA execution only.

