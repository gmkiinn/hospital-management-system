"""add row level security and app role grants

Revision ID: 691a40698b1b
Revises: 13d7446f6c67
Create Date: 2026-07-18 13:07:04.365947

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "691a40698b1b"
down_revision: Union[str, Sequence[str], None] = "13d7446f6c67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_ROLE = "hms_app"

# All app tables the restricted role may read/write.
ALL_TABLES = [
    "hospitals",
    "departments",
    "users",
    "doctors",
    "patients",
    "appointments",
]

# Tenant-scoped tables get RLS keyed on hospital_id.
# (hospitals is the tenant root and has no hospital_id, so it is excluded.)
TENANT_TABLES = [
    "departments",
    "users",
    "doctors",
    "patients",
    "appointments",
]


def upgrade() -> None:
    # 1. Let the app role use the schema and CRUD the app tables.
    op.execute(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}")
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON {', '.join(ALL_TABLES)} TO {APP_ROLE}"
    )

    # 2. Future tables created by the migration role auto-grant CRUD to the app role,
    #    so we don't forget the GRANT when adding tables later.
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {APP_ROLE}"
    )

    # 3. Enable + force RLS and add the tenant-isolation policy on each tenant table.
    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (
                hospital_id = current_setting('app.current_hospital_id', true)::uuid
            )
            WITH CHECK (
                hospital_id = current_setting('app.current_hospital_id', true)::uuid
            )
            """
        )


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM {APP_ROLE}"
    )
    op.execute(
        f"REVOKE SELECT, INSERT, UPDATE, DELETE ON {', '.join(ALL_TABLES)} "
        f"FROM {APP_ROLE}"
    )
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {APP_ROLE}")
