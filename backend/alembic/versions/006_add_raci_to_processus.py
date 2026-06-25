"""Add RACI matrix columns to Processus

Revision ID: 006_add_raci_to_processus
Revises: 005_add_diagnostic_smq
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '006_add_raci_to_processus'
down_revision = '005_add_diagnostic_smq'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('processus', sa.Column('raci_roles', sa.JSON(), nullable=True))
    op.add_column('processus', sa.Column('raci_activities', sa.JSON(), nullable=True))
    op.add_column('processus', sa.Column('raci_cells', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('processus', 'raci_cells')
    op.drop_column('processus', 'raci_activities')
    op.drop_column('processus', 'raci_roles')
