# CI Schema Check (Documented Only)

Add this rule to your CI pipeline when ready:

1. **Fail the PR** if any `.sql` file is created or modified outside `/database/schema/`.
2. **Fail the PR** if `INSERT INTO` appears in `00_schema_core.sql` through `03_schema_misc.sql`.
3. **Fail the PR** if any schema file exceeds 600 lines.
4. **Fail the PR** if `validate_schema.py` does not exit cleanly in dry-run mode.

Implementation: run validation before merging and prevent any unauthorized SQL from entering other directories.

