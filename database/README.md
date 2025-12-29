Database Consolidation Workspace
===============================

This directory contains the **single source of truth** for the production schema:

- `/database/schema/` contains the **only** verified production schema files (00_schema_core.sql, etc.).
- `/database/scripts/` contains read-only automation helpers (`extract_tables.py`, `resolve_dependencies.py`, `split_by_schema.py`, `validate_schema.py`). Do **not** modify existing SQL through these scripts manually.
- `/database/_reports/` captures dependency order and validation outputs; review these before any manual execution.
- `/database/_archive/legacy_migrations/` stores deprecated SQL migrations. **These files must never be executed again.**

Any schema adjustments must follow the scripted workflow and be validated via `database/scripts/validate_schema.py` before deployment.
Database Consolidation Workspace
===============================

This directory contains the **single source of truth** for the production schema:

- `/database/schema/` contains the **only** verified production schema files (00_schema_core.sql, etc.).
- `/database/scripts/` contains read-only automation helpers (`extract_tables.py`, `resolve_dependencies.py`, `split_by_schema.py`, `validate_schema.py`). Do **not** modify existing SQL through these scripts manually.
- `/database/_reports/` captures dependency order and validation outputs; review these before any manual execution.
- `/database/_archive/legacy_migrations/` stores deprecated SQL migrations. **These files must never be executed again.**

Any schema adjustments must follow the scripted workflow and be validated via `database/scripts/validate_schema.py` before deployment.

