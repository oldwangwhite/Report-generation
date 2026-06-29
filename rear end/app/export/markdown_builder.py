from pathlib import Path


def build_markdown(report, outline: list, contents_by_chapter: dict[int, object], path: Path) -> None:
    lines = [f"# {report.report_name}", ""]
    for chapter in outline:
        lines.append(f"{'#' * min(chapter.level + 1, 6)} {chapter.chapter_no} {chapter.title}")
        content = contents_by_chapter.get(chapter.id)
        lines.append(content.content if content else "本章节暂无保存内容。")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")
