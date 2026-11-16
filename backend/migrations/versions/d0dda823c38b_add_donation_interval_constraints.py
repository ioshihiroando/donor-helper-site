"""add donation interval constraints

Revision ID: d0dda823c38b
Revises: 72cd74ec305a
Create Date: 2026-11-04 13:14:07.792297

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd0dda823c38b'
down_revision: Union[str, Sequence[str], None] = '72cd74ec305a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_donation_intervals_days_positive",
        "donation_intervals",
        "days > 0",
    )

    op.create_check_constraint(
        "ck_donation_intervals_dates",
        "donation_intervals",
        "valid_to IS NULL OR valid_to >= valid_from",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_donation_intervals_dates",
        "donation_intervals",
        type_="check",
    )

    op.drop_constraint(
        "ck_donation_intervals_days_positive",
        "donation_intervals",
        type_="check",
    )
