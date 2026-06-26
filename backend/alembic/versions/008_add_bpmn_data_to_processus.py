"""Add bpmn_data column to Processus

Revision ID: 008_add_bpmn_data_to_processus
Revises: 007_add_processus_revision
Create Date: 2026-06-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '008_add_bpmn_data_to_processus'
down_revision = '007_add_processus_revision'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('processus', sa.Column('bpmn_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('processus', 'bpmn_data')
