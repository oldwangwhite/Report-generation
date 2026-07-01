import os
import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_report_backend.db")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("EXPORT_DIR", str(ROOT / "test_exports"))
os.environ.setdefault("UPLOAD_DIR", str(ROOT / "test_uploads"))


@pytest.fixture()
def client(tmp_path: Path) -> Generator[TestClient, None, None]:
    from app.db.base import Base
    from app.db.bootstrap import seed_reference_data
    from app.db.session import get_db
    from app.main import app

    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=Session,
    )
    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as db:
        seed_reference_data(db)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    os.environ["EXPORT_DIR"] = str(tmp_path / "exports")
    os.environ["UPLOAD_DIR"] = str(tmp_path / "uploads")
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer user-token"}


@pytest.fixture()
def admin_headers() -> dict[str, str]:
    return {"Authorization": "Bearer admin-token"}


@pytest.fixture()
def super_headers() -> dict[str, str]:
    return {"Authorization": "Bearer super-token"}
