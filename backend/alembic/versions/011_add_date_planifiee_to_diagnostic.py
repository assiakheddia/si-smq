"""Add date_planifiee column to DiagnosticISO

Revision ID: 011_add_date_planifiee_to_diagnostic
Revises: 010_remove_auditeur_externe_role
Create Date: 2026-06-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '011_add_date_planifiee_to_diagnostic'
down_revision = '010_remove_auditeur_externe_role'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('diagnostics_iso', sa.Column('date_planifiee', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('diagnostics_iso', 'date_planifiee')
