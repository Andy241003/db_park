from typing import Type, Any

from sqlmodel import Session, SQLModel, select


def delete_related_rows(db: Session, model: Type[SQLModel], condition: Any) -> None:
    """Delete all rows matching the provided condition."""
    for row in db.exec(select(model).where(condition)).all():
        db.delete(row)
