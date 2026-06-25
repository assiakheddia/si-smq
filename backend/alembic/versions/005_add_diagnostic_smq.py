"""Add DiagnosticSMQ + Dysfonctionnement (Moteur Analytique IA)

Revision ID: 005_add_diagnostic_smq
Revises: 004_remap_roles_to_ui
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '005_add_diagnostic_smq'
down_revision = '004_remap_roles_to_ui'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'diagnostics_smq',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reference', sa.String(length=50), nullable=True),
        sa.Column('processus_id', sa.Integer(), nullable=False),
        sa.Column('declencheur_id', sa.Integer(), nullable=True),
        sa.Column('statut', sa.Enum('en_cours', 'termine', 'echec', name='statutdiagnosticsmq'), nullable=False, server_default='en_cours'),
        sa.Column('score_global', sa.Float(), nullable=True),
        sa.Column('source_globale', sa.Enum('ia', 'local', 'mixte', name='sourceevaluation'), nullable=True),
        sa.Column('date_lancement', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('date_fin', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['processus_id'], ['processus.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['declencheur_id'], ['utilisateurs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reference'),
    )
    op.create_index(op.f('ix_diagnostics_smq_processus_id'), 'diagnostics_smq', ['processus_id'], unique=False)
    op.create_index(op.f('ix_diagnostics_smq_reference'), 'diagnostics_smq', ['reference'], unique=False)

    op.create_table(
        'dysfonctionnements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('diagnostic_id', sa.Integer(), nullable=False),
        sa.Column('processus_id', sa.Integer(), nullable=False),
        sa.Column('clause_iso_code', sa.String(length=20), nullable=True),
        sa.Column('titre', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('consequences', sa.Text(), nullable=True),
        sa.Column('causes', sa.Text(), nullable=True),
        sa.Column('ameliorations', sa.Text(), nullable=True),
        sa.Column('gravite', sa.Enum('mineur', 'moyen', 'majeur', 'critique', name='gravitedysfonctionnement'), nullable=False, server_default='mineur'),
        sa.Column('source', sa.Enum('ia', 'local', 'mixte', name='sourceevaluation'), nullable=False, server_default='local'),
        sa.Column('statut', sa.Enum('ouvert', 'en_cours', 'resolu', name='statutdysfonctionnement'), nullable=False, server_default='ouvert'),
        sa.Column('responsable_id', sa.Integer(), nullable=True),
        sa.Column('echeance', sa.Date(), nullable=True),
        sa.Column('ordre', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['diagnostic_id'], ['diagnostics_smq.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['processus_id'], ['processus.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['responsable_id'], ['utilisateurs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_dysfonctionnements_diagnostic_id'), 'dysfonctionnements', ['diagnostic_id'], unique=False)
    op.create_index(op.f('ix_dysfonctionnements_processus_id'), 'dysfonctionnements', ['processus_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_dysfonctionnements_processus_id'), table_name='dysfonctionnements')
    op.drop_index(op.f('ix_dysfonctionnements_diagnostic_id'), table_name='dysfonctionnements')
    op.drop_table('dysfonctionnements')

    op.drop_index(op.f('ix_diagnostics_smq_reference'), table_name='diagnostics_smq')
    op.drop_index(op.f('ix_diagnostics_smq_processus_id'), table_name='diagnostics_smq')
    op.drop_table('diagnostics_smq')

    sa.Enum(name='statutdysfonctionnement').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='gravitedysfonctionnement').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='sourceevaluation').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='statutdiagnosticsmq').drop(op.get_bind(), checkfirst=True)
