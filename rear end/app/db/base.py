from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import models so Base.metadata contains every mapped table.
import app.entity  # noqa: E402,F401
