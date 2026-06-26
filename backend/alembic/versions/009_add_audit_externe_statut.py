"""Add audit_externe value to StatutDiagnostic enum

Revision ID: 009_add_audit_externe_statut
Revises: 008_add_bpmn_data_to_processus
Create Date: 2026-06-26 00:00:00.000000

"""
from alembic import op


revision = '009_add_audit_externe_statut'
down_revision = '008_add_bpmn_data_to_processus'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE statutdiagnostic ADD VALUE IF NOT EXISTS 'audit_externe'")


def downgrade() -> None:
    # PostgreSQL ne permet pas de retirer une valeur d'un enum sans recréer le type.
    # Les diagnostics avec statut='audit_externe' devraient être repassés à 'valide'
    # avant un downgrade en production.
    pass
