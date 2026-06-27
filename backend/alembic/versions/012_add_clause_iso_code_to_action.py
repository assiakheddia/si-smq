"""Add clause_iso_code column to Action

Revision ID: 012_add_clause_iso_code_to_action
Revises: 011_add_date_planifiee_to_diagnostic
Create Date: 2026-06-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '012_add_clause_iso_code_to_action'
down_revision = '011_add_date_planifiee_to_diagnostic'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('actions', sa.Column('clause_iso_code', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('actions', 'clause_iso_code')
