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


def flatten_outline(tree: list[dict]) -> list[dict]:
    items: list[dict] = []

    def walk(nodes: list[dict], parent_index: int | None = None) -> None:
        for node in nodes:
            index = len(items)
            items.append(
                {
                    "title": node["title"],
                    "level": node["level"],
                    "parentIndex": parent_index,
                    "sortOrder": len([i for i in items if i.get("parentIndex") == parent_index])
                    + 1,
                }
            )
            walk(node.get("children", []), index)

    walk(tree)
    return items
