"""Add reference column to Dysfonctionnement

Revision ID: 013_add_reference_to_dysfonctionnement
Revises: 012_add_clause_iso_code_to_action
Create Date: 2026-06-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '013_add_reference_to_dysfonctionnement'
down_revision = '012_add_clause_iso_code_to_action'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('dysfonctionnements', sa.Column('reference', sa.String(length=50), nullable=True))
    op.create_index('ix_dysfonctionnements_reference', 'dysfonctionnements', ['reference'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_dysfonctionnements_reference', table_name='dysfonctionnements')
    op.drop_column('dysfonctionnements', 'reference')
