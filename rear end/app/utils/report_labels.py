REPORT_TYPE_LABELS = {
    "summerCheck": "迎峰度夏检查报告",
    "coalInventoryAudit": "煤场库存盘点报告",
}


def report_type_label(report_type: str | None) -> str:
    if not report_type:
        return "未指定报告类型"
    return REPORT_TYPE_LABELS.get(report_type, report_type)