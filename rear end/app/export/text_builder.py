from pathlib import Path

from app.utils.report_labels import report_type_label


def build_text(report, outline: list, contents_by_chapter: dict[int, object], path: Path) -> None:
    lines = [
        report.report_name,
        "",
        f"报告类型：{report_type_label(report.report_type)}",
        f"主题：{report.topic or ''}",
        f"电厂：{report.plant or ''}",
        f"专业：{report.major or ''}",
        f"年份：{report.year or ''}",
        "",
    ]
    for chapter in outline:
        lines.append(f"{chapter.chapter_no} {chapter.title}")
        content = contents_by_chapter.get(chapter.id)
        lines.append(content.content if content else "本章节暂无保存内容。")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")