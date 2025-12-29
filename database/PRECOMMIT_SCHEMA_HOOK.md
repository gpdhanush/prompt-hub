A suggested pre-commit hook (documented only):

1. Detect any `.sql` file staged outside `/database/schema/` and abort the commit.
2. Run `python3 database/scripts/validate_schema.py` in dry mode; fail if it exits non-zero.
3. Prevent the commit if any schema file (`00_schema_core.sql`…`03_schema_misc.sql`) includes `INSERT INTO`.
4. Ensure edited schema files remain under the 600-line limit.

Implement this hook manually when automation maturity allows. For now, use `validate_schema.py` manually as part of your workflow.

