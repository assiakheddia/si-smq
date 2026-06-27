"""Add est_evalue column to DiagnosticClause

Revision ID: 014_add_est_evalue_to_diagnostic_clause
Revises: 013_add_reference_to_dysfonctionnement
Create Date: 2026-06-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '014_add_est_evalue_to_diagnostic_clause'
down_revision = '013_add_reference_to_dysfonctionnement'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'diagnostics_clauses',
        sa.Column('est_evalue', sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # Backfill : les diagnostics déjà avancés (soumis/valide/audit_externe/archive)
    # ont passé l'ancien contrôle de complétude (même bugué) — on considère leurs
    # clauses existantes comme évaluées pour ne pas changer leur statut rétroactivement.
    op.execute("""
        UPDATE diagnostics_clauses dc
        SET est_evalue = TRUE
        FROM diagnostics_iso d
        WHERE dc.diagnostic_id = d.id
          AND d.statut != 'brouillon'
    """)

    # Pour les diagnostics encore en brouillon : une clause est considérée
    # évaluée seulement si elle diffère des valeurs par défaut (preuve qu'un
    # score réel a été saisi), pas seulement parce que la ligne existe.
    op.execute("""
        UPDATE diagnostics_clauses dc
        SET est_evalue = TRUE
        FROM diagnostics_iso d
        WHERE dc.diagnostic_id = d.id
          AND d.statut = 'brouillon'
          AND (dc.score != 0.0 OR dc.niveau != 'non_conforme' OR dc.type_ecart IS NOT NULL)
    """)


def downgrade() -> None:
    op.drop_column('diagnostics_clauses', 'est_evalue')
