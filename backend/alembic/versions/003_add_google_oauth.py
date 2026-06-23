"""Add Google OAuth support (google_id column, nullable hashed_password)

Revision ID: 003_add_google_oauth
Revises: 002_add_diagnostic_iso
Create Date: 2026-06-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '003_add_google_oauth'
down_revision = '002_add_diagnostic_iso'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('utilisateurs', 'hashed_password', nullable=True)
    op.add_column('utilisateurs', sa.Column('google_id', sa.String(100), nullable=True))
    op.create_unique_constraint('uq_utilisateurs_google_id', 'utilisateurs', ['google_id'])
    op.create_index('ix_utilisateurs_google_id', 'utilisateurs', ['google_id'])


def downgrade() -> None:
    op.drop_index('ix_utilisateurs_google_id', table_name='utilisateurs')
    op.drop_constraint('uq_utilisateurs_google_id', 'utilisateurs', type_='unique')
    op.drop_column('utilisateurs', 'google_id')
    op.alter_column('utilisateurs', 'hashed_password', nullable=False)
