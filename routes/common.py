from datetime import date


def serialize(obj):
    if obj is None:
        return None
    if hasattr(obj, "__table__"):
        d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
        for k, v in d.items():
            if isinstance(v, date):
                d[k] = v.isoformat()
        return d
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if isinstance(obj, dict):
        return {k: v.isoformat() if isinstance(v, date) else v for k, v in obj.items()}
    return obj
