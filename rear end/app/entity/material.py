from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func

from app.db.base import Base
from app.db.types import IdType


class Material(Base):
    __tablename__ = "materials"

    id = Column(IdType, primary_key=True, autoincrement=True)
    name = Column(String(500), nullable=False)
    type = Column(String(50), nullable=False, index=True)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(20))
    description = Column(Text)
    created_by = Column(IdType, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MaterialTag(Base):
    __tablename__ = "material_tags"

    id = Column(IdType, primary_key=True, autoincrement=True)
    material_id = Column(IdType, ForeignKey("materials.id"), nullable=False, index=True)
    tag_key = Column(String(100), nullable=False)
    tag_value = Column(String(200), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
