import base64

from fastapi import APIRouter, Depends, UploadFile, File

from src.entity.models import User
from src.utils.dependencies import get_current_user
from src.utils.minio_client import get_presigned_url, upload_file
from src.utils.response import success_response

router = APIRouter(prefix="/api/modules", tags=["modules"])


def _svg_data_uri(svg: str) -> str:
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


_module_images = {
    "qa": _svg_data_uri(
        '<svg width="480" height="320" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="320" rx="0" fill="#ecfdf5"/><rect x="70" y="70" width="340" height="180" rx="16" fill="#fff"/><circle cx="120" cy="120" r="24" fill="#0f766e"/><rect x="160" y="100" width="190" height="14" rx="7" fill="#94d3a6"/><rect x="160" y="130" width="230" height="14" rx="7" fill="#cef7e0"/><rect x="90" y="170" width="300" height="48" rx="10" fill="#f0fdf4"/></svg>'
    ),
    "report": _svg_data_uri(
        '<svg width="480" height="320" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="320" fill="#eff6ff"/><rect x="128" y="40" width="224" height="240" rx="14" fill="#fff" stroke="#bdd7ff" stroke-width="2"/><path d="M300 40v54h52" fill="#dbeafe"/><path d="M300 40l52 54" fill="none" stroke="#93c5fd" stroke-width="2"/><rect x="160" y="86" width="128" height="18" rx="9" fill="#1769e0"/><rect x="160" y="126" width="154" height="12" rx="6" fill="#94c5fd"/><rect x="160" y="154" width="130" height="12" rx="6" fill="#bdd7ff"/><rect x="160" y="182" width="168" height="12" rx="6" fill="#bdd7ff"/><rect x="160" y="218" width="126" height="34" rx="8" fill="#dbeafe"/><rect x="296" y="218" width="28" height="34" rx="6" fill="#60a5fa"/></svg>'
    ),
    "knowledge": _svg_data_uri(
        '<svg width="480" height="320" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="320" fill="#faf5ff"/><rect x="92" y="72" width="78" height="178" rx="10" fill="#7c3aed"/><rect x="186" y="54" width="82" height="196" rx="10" fill="#a78bfa"/><rect x="284" y="86" width="86" height="164" rx="10" fill="#db2777"/><rect x="112" y="112" width="38" height="10" rx="5" fill="#fff"/><rect x="112" y="134" width="28" height="8" rx="4" fill="#ddd6fe"/><rect x="208" y="98" width="38" height="10" rx="5" fill="#fff"/><rect x="208" y="120" width="30" height="8" rx="4" fill="#ede9fe"/><rect x="306" y="132" width="42" height="10" rx="5" fill="#fff"/><rect x="306" y="154" width="30" height="8" rx="4" fill="#fce7f3"/><rect x="82" y="250" width="306" height="16" rx="8" fill="#e9d5ff"/></svg>'
    ),
}

_module_configs = [
    {
        "id": "qa",
        "title": "\u77e5\u8bc6\u95ee\u7b54",
        "subtitle": "Knowledge Q&A",
        "description": "\u57fa\u4e8e\u7535\u529b\u884c\u4e1a\u77e5\u8bc6\u5e93\u7684\u667a\u80fd\u95ee\u7b54\u80fd\u529b\uff0c\u652f\u6301\u89c4\u7a0b\u68c0\u7d22\u3001\u95ee\u9898\u5b9a\u4f4d\u548c\u591a\u8f6e\u8ffd\u95ee\u3002",
        "color": "#0f766e",
        "gradient": "linear-gradient(135deg, #0f766e 0%, #22c55e 100%)",
        "features": [
            "\u81ea\u7136\u8bed\u8a00\u7406\u89e3",
            "\u89c4\u7a0b\u7cbe\u51c6\u5339\u914d",
            "\u591a\u8f6e\u5bf9\u8bdd\u652f\u6301",
        ],
        "imageUrl": _module_images["qa"],
    },
    {
        "id": "report",
        "title": "\u62a5\u544a\u751f\u6210",
        "subtitle": "Report Generation",
        "description": "\u81ea\u52a8\u751f\u6210\u8fce\u5cf0\u5ea6\u590f\u68c0\u67e5\u3001\u7164\u5e93\u5b58\u5ba1\u8ba1\u7b49\u4e13\u4e1a\u62a5\u544a\uff0c\u8986\u76d6\u5927\u7eb2\u3001\u6b63\u6587\u3001\u8868\u683c\u548c\u5bfc\u51fa\u3002",
        "color": "#1769e0",
        "gradient": "linear-gradient(135deg, #1769e0 0%, #38bdf8 100%)",
        "features": [
            "\u6a21\u677f\u667a\u80fd\u5339\u914d",
            "\u6570\u636e\u81ea\u52a8\u586b\u5145",
            "\u591a\u683c\u5f0f\u5bfc\u51fa",
        ],
        "imageUrl": _module_images["report"],
    },
    {
        "id": "knowledge",
        "title": "\u77e5\u8bc6\u5e93\u7ba1\u7406",
        "subtitle": "Knowledge Base",
        "description": "\u4e0a\u4f20\u3001\u5206\u7c7b\u3001\u68c0\u7d22\u4f01\u4e1a\u5185\u90e8\u6280\u672f\u6587\u6863\uff0c\u6c89\u6dc0\u53ef\u590d\u7528\u7684\u4e13\u4e1a\u77e5\u8bc6\u8d44\u4ea7\u3002",
        "color": "#7c3aed",
        "gradient": "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
        "features": [
            "\u6587\u6863\u667a\u80fd\u5206\u7c7b",
            "\u5168\u6587\u68c0\u7d22",
            "\u7248\u672c\u7ba1\u7406",
        ],
        "imageUrl": _module_images["knowledge"],
    },
]


@router.get("/home")
async def get_home_modules():
    return success_response([module.copy() for module in _module_configs])


@router.post("/upload-image")
async def upload_module_image(
    file: UploadFile = File(...),
    module_id: str = None,
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(content)

    object_name = f"modules/{module_id or 'default'}/{file.filename}"
    upload_file(object_name, temp_path, file.content_type)
    url = get_presigned_url(object_name)
    return success_response({"url": url, "objectName": object_name})
