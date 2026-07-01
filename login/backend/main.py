from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.controller.router import router as auth_router        # 认证路由
from src.controller.module_router import router as module_router  # 模块路由
from src.config.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="电力行业技术监督辅助平台")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)      # 注册认证路由（包含 /api/auth/*）
app.include_router(module_router)    # 注册模块路由（包含 /api/modules/*）

@app.get("/api/health")
async def health():
    return {"status": "ok"}