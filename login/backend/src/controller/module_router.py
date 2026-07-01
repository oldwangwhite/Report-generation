from fastapi import APIRouter, Depends, UploadFile, File
from typing import List
from src.utils.minio_client import get_presigned_url, upload_file
from src.utils.response import success_response, error_response
from src.utils.dependencies import get_current_user   # 如果需要认证
from src.entity.models import User

router = APIRouter(prefix="/api/modules", tags=["modules"])

# 模块配置（实际项目中可存在数据库，这里模拟）
_module_configs = [
    {
        "id": "qa",
        "title": "知识问答",
        "subtitle": "Knowledge Q&A",
        "description": "基于海量电力规程的智能问答...",
        "color": "#52c41a",
        "gradient": "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
        "features": ["自然语言理解", "规程精准匹配", "多轮对话支持"],
        "imageObject": "home-qa.png"   # MinIO 中的对象名
    },
    {
        "id": "report",
        "title": "报告生成",
        "subtitle": "Report Generation",
        "description": "自动生成迎峰度夏检查报告...",
        "color": "#1890ff",
        "gradient": "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
        "features": ["模板智能匹配", "数据自动填充", "多格式导出"],
        "imageObject": "home-report.png"
    },
    {
        "id": "knowledge",
        "title": "知识库管理",
        "subtitle": "Knowledge Base",
        "description": "上传、分类、检索企业内部技术文档...",
        "color": "#722ed1",
        "gradient": "linear-gradient(135deg, #722ed1 0%, #531dab 100%)",
        "features": ["文档智能分类", "全文检索", "版本管理"],
        "imageObject": "home-knowledge.png"
    }
]

@router.get("/home")
async def get_home_modules():
    modules = []
    for mod in _module_configs:
        data = mod.copy()
        # 生成图片预签名 URL（1小时有效期）
        data["imageUrl"] = get_presigned_url(mod["imageObject"], expires=3600)
        modules.append(data)
    return success_response(modules)

@router.post("/upload-image")
async def upload_module_image(
    file: UploadFile = File(...),
    module_id: str = None,
    current_user: User = Depends(get_current_user)  # 要求登录，且角色为 admin（可自己加判断）
):
    # 示例：简单保存到临时文件，上传到 MinIO
    content = await file.read()
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(content)
    object_name = f"modules/{module_id or 'default'}/{file.filename}"
    upload_file(object_name, temp_path, file.content_type)
    # 返回预签名 URL
    url = get_presigned_url(object_name)
    return success_response({"url": url, "objectName": object_name})