"""Reassign auditeur_externe users to auditeur_interne (role removed)

The application no longer models a separate "External Auditor" role — it
prepares processes for certification but Direction now simply launches the
external audit once a diagnostic is validated internally (see
StatutDiagnostic.audit_externe, migration 009).

PostgreSQL cannot drop a value from an existing enum type without recreating
it, so the 'auditeur_externe' label is left (unused) in the roleenum type.
This migration only reassigns any existing user rows so no data references
a role value the application code no longer recognizes.

Revision ID: 010_remove_auditeur_externe_role
Revises: 009_add_audit_externe_statut
Create Date: 2026-06-26 00:00:00.000000

"""
from alembic import op


revision = '010_remove_auditeur_externe_role'
down_revision = '009_add_audit_externe_statut'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE utilisateurs SET role = 'auditeur_interne' WHERE role = 'auditeur_externe'"
    )


def downgrade() -> None:
    # Non réversible : on ne sait plus distinguer les utilisateurs qui étaient
    # auditeur_externe avant cette migration.
    pass
