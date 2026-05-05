from pathlib import Path

path = Path('/app/app/api/v1/endpoints/restaurant_settings.py')
text = path.read_text()

if 'from sqlalchemy.exc import OperationalError' not in text:
    text = text.replace(
        'from sqlalchemy.orm.attributes import flag_modified\nfrom pydantic import BaseModel\n',
        'from sqlalchemy.exc import OperationalError\nfrom sqlalchemy.orm.attributes import flag_modified\nfrom pydantic import BaseModel\n',
    )

if 'def commit_with_retry(db, retries: int = 3, delay: float = 0.5):' not in text:
    text = text.replace(
        'router = APIRouter()\n\n\n# ==========================================\n',
        'router = APIRouter()\n\n\ndef commit_with_retry(db, retries: int = 3, delay: float = 0.5):\n'
        '    """Commit with retry on MySQL lock wait timeout."""\n'
        '    attempt = 0\n'
        '    while True:\n'
        '        try:\n'
        '            db.commit()\n'
        '            return\n'
        '        except OperationalError as exc:\n'
        '            if getattr(exc.orig, "args", None) and exc.orig.args[0] == 1205 and attempt < retries:\n'
        '                db.rollback()\n'
        '                import time\n'
        '                time.sleep(delay * (attempt + 1))\n'
        '                attempt += 1\n'
        '                continue\n'
        '            raise\n\n\n# ==========================================\n',
    )

text = text.replace(
    '        db.add(existing)\n        db.commit()\n        db.refresh(existing)\n',
    '        db.add(existing)\n        commit_with_retry(db)\n        db.refresh(existing)\n',
)
text = text.replace(
    '    db.add(new_page)\n    db.commit()\n    db.refresh(new_page)\n',
    '    db.add(new_page)\n    commit_with_retry(db)\n    db.refresh(new_page)\n',
)

path.write_text(text)
print('patched', path)
