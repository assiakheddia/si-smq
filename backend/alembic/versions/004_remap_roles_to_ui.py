"""Remap RoleEnum from (admin, pilote, contributeur, auditeur) to the
frontend's role taxonomy: preparateur, auditeur_interne, auditeur_externe,
direction.

Mapping applied to existing rows:
    admin        -> direction
    pilote       -> preparateur
    contributeur -> preparateur
    auditeur     -> auditeur_interne

Revision ID: 004_remap_roles_to_ui
Revises: 003_add_google_oauth
Create Date: 2026-06-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '004_remap_roles_to_ui'
down_revision = '003_add_google_oauth'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE utilisateurs ALTER COLUMN role TYPE VARCHAR(50)")
    op.execute("DROP TYPE roleenum")
    op.execute("""
        UPDATE utilisateurs SET role = CASE role
            WHEN 'admin'        THEN 'direction'
            WHEN 'pilote'       THEN 'preparateur'
            WHEN 'contributeur' THEN 'preparateur'
            WHEN 'auditeur'     THEN 'auditeur_interne'
            ELSE role
        END
    """)
    op.execute(
        "CREATE TYPE roleenum AS ENUM "
        "('preparateur', 'auditeur_interne', 'auditeur_externe', 'direction')"
    )
    op.execute(
        "ALTER TABLE utilisateurs "
        "ALTER COLUMN role TYPE roleenum USING role::roleenum, "
        "ALTER COLUMN role SET DEFAULT 'preparateur'"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE utilisateurs ALTER COLUMN role TYPE VARCHAR(50)")
    op.execute("DROP TYPE roleenum")
    op.execute("""
        UPDATE utilisateurs SET role = CASE role
            WHEN 'direction'        THEN 'admin'
            WHEN 'preparateur'      THEN 'pilote'
            WHEN 'auditeur_interne' THEN 'auditeur'
            WHEN 'auditeur_externe' THEN 'auditeur'
            ELSE role
        END
    """)
    op.execute(
        "CREATE TYPE roleenum AS ENUM "
        "('admin', 'pilote', 'contributeur', 'auditeur')"
    )
    op.execute(
        "ALTER TABLE utilisateurs "
        "ALTER COLUMN role TYPE roleenum USING role::roleenum, "
        "ALTER COLUMN role SET DEFAULT 'contributeur'"
    )
