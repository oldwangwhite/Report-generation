from app.entity.outline import ReportOutline
from app.entity.report import ReportRecord
from app.utils.id_utils import to_external_id


def generate_chapter_text(report: ReportRecord, chapter: ReportOutline, extra_prompt: str | None = None) -> str:
    prompt_note = f" {extra_prompt}" if extra_prompt else ""
    return (
        f"{chapter.chapter_no} {chapter.title}：本章节围绕{report.topic}展开，"
        f"结合{report.plant or '电厂'}、{report.major or '相关专业'}、{report.year or ''}年度资料，"
        f"梳理检查依据、发现问题和整改建议。{prompt_note}"
    ).strip()


def generate_table(chapter: ReportOutline) -> dict:
    return {
        "tableId": f"tbl_{chapter.id:03d}",
        "title": f"{chapter.title}情况表",
        "headers": ["序号", "检查项", "问题", "整改建议"],
        "rows": [["1", chapter.title, "需持续跟踪", "建立整改闭环"]],
    }


def chunk_text(text: str, size: int = 24) -> list[str]:
    return [text[i : i + size] for i in range(0, len(text), size)] or [""]


def chapter_start_payload(report: ReportRecord, chapter: ReportOutline) -> dict:
    return {
        "reportId": to_external_id("rpt", report.id),
        "chapterId": to_external_id("chap", chapter.id),
        "chapterNo": chapter.chapter_no,
        "title": chapter.title,
    }
