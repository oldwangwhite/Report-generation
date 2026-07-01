from typing import Any


def default_outline(report_type: str) -> list[dict]:
    if report_type == "coalInventoryAudit":
        return [
            {"title": "审计概况", "level": 1, "children": [{"title": "审计范围", "level": 2}]},
            {"title": "库存盘点情况", "level": 1, "children": [{"title": "账实核对", "level": 2}]},
            {"title": "问题分析", "level": 1, "children": [{"title": "风险提示", "level": 2}]},
            {"title": "整改建议", "level": 1, "children": []},
        ]
    return [
        {"title": "检查概况", "level": 1, "children": [{"title": "检查范围", "level": 2}]},
        {"title": "设备运行情况", "level": 1, "children": [{"title": "重点设备检查", "level": 2}]},
        {"title": "问题与风险", "level": 1, "children": [{"title": "整改闭环", "level": 2}]},
        {"title": "结论与建议", "level": 1, "children": []},
    ]


def outline_from_template_structure(
    structure: dict[str, Any] | None,
    report_type: str,
) -> list[dict]:
    if not structure:
        return default_outline(report_type)
    outline = structure.get("outline")
    normalized = _normalize_nodes(outline, level=1)
    return normalized or default_outline(report_type)


def flatten_outline(tree: list[dict]) -> list[dict]:
    items: list[dict] = []

    def walk(nodes: list[dict], parent_index: int | None = None) -> None:
        for node in nodes:
            index = len(items)
            siblings_before = [item for item in items if item.get("parentIndex") == parent_index]
            items.append(
                {
                    "title": str(node["title"]).strip(),
                    "level": int(node.get("level") or 1),
                    "parentIndex": parent_index,
                    "sortOrder": len(siblings_before) + 1,
                }
            )
            walk(node.get("children", []) or [], index)

    walk(tree)
    return items


def _normalize_nodes(raw: Any, level: int) -> list[dict]:
    if raw is None:
        return []
    if isinstance(raw, dict):
        raw = raw.get("children") or raw.get("chapters") or raw.get("items") or []
    if not isinstance(raw, list):
        return []

    nodes: list[dict] = []
    for item in raw:
        if isinstance(item, str):
            title = item.strip()
            children: list[dict] = []
            item_level = level
        elif isinstance(item, dict):
            title = str(item.get("title") or item.get("name") or "").strip()
            item_level = _safe_level(item.get("level"), level)
            children = _normalize_nodes(
                item.get("children") or item.get("sections") or item.get("items"),
                item_level + 1,
            )
        else:
            continue
        if title:
            nodes.append({"title": title, "level": item_level, "children": children})
    return nodes


def _safe_level(value: Any, fallback: int) -> int:
    try:
        return max(1, min(int(value), 4))
    except (TypeError, ValueError):
        return max(1, min(fallback, 4))
