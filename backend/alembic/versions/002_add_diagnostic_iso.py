"""Add DiagnosticISO model

Revision ID: 002_add_diagnostic_iso
Revises: 001
Create Date: 2026-04-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_diagnostic_iso'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Créer la table diagnostics_iso
    op.create_table(
        'diagnostics_iso',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('processus_id', sa.Integer(), nullable=False),
        sa.Column('clause_iso_id', sa.Integer(), nullable=False),
        sa.Column('auditeur_id', sa.Integer(), nullable=True),
        sa.Column('score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('niveau', sa.Enum('non_conforme', 'partiel', 'avance', 'conforme', name='niveauconformite'), nullable=False, server_default='non_conforme'),
        sa.Column('description_ecart', sa.Text(), nullable=True),
        sa.Column('justification', sa.Text(), nullable=True),
        sa.Column('recommandation', sa.Text(), nullable=True),
        sa.Column('observation', sa.Text(), nullable=True),
        sa.Column('est_action_requise', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('date_action_prevue', sa.DateTime(), nullable=True),
        sa.Column('statut', sa.Enum('brouillon', 'en_audit', 'valide', 'en_amelioration', 'clos', name='statutdiagnostic'), nullable=False, server_default='brouillon'),
        sa.Column('date_creation', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('date_validation', sa.DateTime(), nullable=True),
        sa.Column('date_mise_a_jour', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['processus_id'], ['processus.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['clause_iso_id'], ['clauses_iso.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['auditeur_id'], ['utilisateurs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Créer les index
    op.create_index(op.f('ix_diagnostics_iso_processus_id'), 'diagnostics_iso', ['processus_id'], unique=False)
    op.create_index(op.f('ix_diagnostics_iso_clause_iso_id'), 'diagnostics_iso', ['clause_iso_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_diagnostics_iso_clause_iso_id'), table_name='diagnostics_iso')
    op.drop_index(op.f('ix_diagnostics_iso_processus_id'), table_name='diagnostics_iso')
    op.drop_table('diagnostics_iso')
