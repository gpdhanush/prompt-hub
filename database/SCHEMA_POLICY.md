# Database Schema Policy

## Purpose

This policy locks down the consolidation workspace so that:
1. `/database/schema/` stores the **only active production DDL**.
2. `/database/scripts/` are read-only helpers; scripts must not mutate SQL in other places.
3. `/database/_archive/` retains legacy SQL that must never be run again.

## Rules

- Only `/database/schema/*.sql` may contain active SQL definitions.  
- No `.sql` files are allowed anywhere else in the repo (root, frontend, backend, `/database` root, etc.).  
- Legacy SQL must always live under `/database/_archive/`.  
- Schema files (`00_schema_core.sql`…`03_schema_misc.sql`) must **never include `INSERT INTO`** statements.  
- All seed DML belongs exclusively in `10_seed_production.sql`.  
- Introducing a new table requires rerunning the scripted workflow (extract → resolve → split) and a passing `validate_schema.py` run.

## Rules

- No SQL files may be added anywhere other than `/database/`.
- New DDL must be added to `/database/schema/` only.
- Schema files (`00_schema_core.sql` through `03_schema_misc.sql`) **must not** contain `INSERT INTO`.
- All seed data belongs solely in `10_seed_production.sql`.
- Adding a new table requires re-running the automated workflow (extract → resolve → split) and a **passing** run of `validate_schema.py`.

## CI Guardrail (Documented Only)

Before merging, add a CI check that:

1. Fails if any new `.sql` file appears outside `/database/`.
2. Fails if `INSERT INTO` is detected in `00_schema_core.sql` … `03_schema_misc.sql`.
3. Fails if any schema file exceeds 600 lines.

Implement this guardrail once scripts and files are stable; this document ensures the requirement is visible now.

