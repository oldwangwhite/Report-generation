from app.db.base import Base


def test_report_tables_have_required_base_columns():
    expected = {
        "report_records",
        "report_outlines",
        "report_chapter_contents",
        "report_exports",
        "report_templates",
    }
    assert expected.issubset(set(Base.metadata.tables))

    for table_name in expected:
        table = Base.metadata.tables[table_name]
        assert {"id", "created_at", "updated_at", "deleted_flag"}.issubset(
            set(table.columns.keys())
        )


def test_seed_reference_data_reuses_existing_usernames(tmp_path):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session, sessionmaker

    from app.db.bootstrap import seed_reference_data
    from app.entity.user import User

    db_path = tmp_path / "seed.db"
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
        db.add(
            User(
                id=1,
                username="admin",
                password_hash="existing",
                display_name="Existing admin",
                role_id=1,
                is_active=True,
            )
        )
        db.commit()

        seed_reference_data(db)

        assert db.query(User).filter(User.username == "admin").count() == 1
        assert db.query(User).filter(User.username == "super").count() == 1


def test_reused_existing_tables_are_mapped():
    expected = {
        "users",
        "roles",
        "materials",
        "material_tags",
        "system_configs",
        "operation_logs",
    }
    assert expected.issubset(set(Base.metadata.tables))
