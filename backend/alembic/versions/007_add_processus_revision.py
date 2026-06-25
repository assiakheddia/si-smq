"""Add ProcessusRevision (real version history)

Revision ID: 007_add_processus_revision
Revises: 006_add_raci_to_processus
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '007_add_processus_revision'
down_revision = '006_add_raci_to_processus'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'processus_revisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('processus_id', sa.Integer(), nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False),
        sa.Column('auteur_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('statut', sa.Enum('approuve', 'archive', name='statutrevision'), nullable=False, server_default='approuve'),
        sa.Column('date_revision', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['processus_id'], ['processus.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['auteur_id'], ['utilisateurs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_processus_revisions_processus_id'), 'processus_revisions', ['processus_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_processus_revisions_processus_id'), table_name='processus_revisions')
    op.drop_table('processus_revisions')
    sa.Enum(name='statutrevision').drop(op.get_bind(), checkfirst=True)
