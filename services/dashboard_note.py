from db import SessionLocal
from models import DashboardNote


def get_dashboard_note():
    session = SessionLocal()
    note = session.query(DashboardNote).first()
    if not note:
        note = DashboardNote(content="")
        session.add(note)
        session.commit()
        session.refresh(note)
    session.close()
    return note


def set_dashboard_note(content: str):
    session = SessionLocal()
    note = session.query(DashboardNote).first()
    if not note:
        note = DashboardNote(content=content)
        session.add(note)
    else:
        note.content = content
    session.commit()
    session.refresh(note)
    session.close()
    return note
