from typing import Optional
from sqlmodel import Session, select
from ..models import Setting

def get_setting(key: str, session: Session, default: str = "") -> str:
    setting = session.exec(select(Setting).where(Setting.key == key)).first()
    return setting.value if setting else default

def set_setting(key: str, value: str, session: Session):
    setting = session.exec(select(Setting).where(Setting.key == key)).first()
    if setting:
        setting.value = value
    else:
        setting = Setting(key=key, value=value)
    session.add(setting)
    session.commit()
