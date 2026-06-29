from app.entity.outline import ReportOutline


def renumber_outline(chapters: list[ReportOutline]) -> list[ReportOutline]:
    by_parent: dict[int | None, list[ReportOutline]] = {}
    for chapter in chapters:
        by_parent.setdefault(chapter.parent_id, []).append(chapter)

    for siblings in by_parent.values():
        siblings.sort(key=lambda item: (item.sort_order, item.id or 0))

    ordered: list[ReportOutline] = []

    def walk(parent_id: int | None, prefix: str | None, level: int) -> None:
        for index, chapter in enumerate(by_parent.get(parent_id, []), start=1):
            chapter.level = level
            chapter.sort_order = index
            chapter.chapter_no = str(index) if prefix is None else f"{prefix}.{index}"
            ordered.append(chapter)
            walk(chapter.id, chapter.chapter_no, level + 1)

    walk(None, None, 1)
    return ordered
