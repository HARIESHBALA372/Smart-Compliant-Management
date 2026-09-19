import uuid
import datetime

def generate_id() -> str:
    """Generate a clean unique string ID."""
    return uuid.uuid4().hex

_counter = 0

def generate_complaint_number() -> str:
    """Generate a unique complaint number format CMP-YYYY-XXXX."""
    global _counter
    _counter += 1
    year = datetime.datetime.now().year
    suffix = uuid.uuid4().hex[:6].upper()
    return f"CMP-{year}-{suffix}"
