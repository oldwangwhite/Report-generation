from app.entity.outline import ReportOutline
from app.entity.report import ReportRecord
from app.utils.id_utils import to_external_id
from app.utils.report_labels import report_type_label


def build_chapter_prompt(
    report: ReportRecord,
    chapter: ReportOutline,
    extra_prompt: str | None = None,
    material_context: str | None = None,
) -> str:
    report_type = report_type_label(report.report_type)
    topic = report.topic or "未指定"
    plant = report.plant or "未指定电厂"
    major = report.major or "相关专业"
    year = report.year or "未指定年份"
    extra = f"\n补充要求：{extra_prompt}" if extra_prompt else ""
    materials = f"\n\n可参考的专业素材：\n{material_context}" if material_context else ""
    return f"""
请生成一段正式、可直接放入技术监督报告的章节正文。

报告类型：{report_type}
报告主题：{topic}
电厂：{plant}
专业：{major}
年份：{year}
章节编号：{chapter.chapter_no}
章节标题：{chapter.title}
章节层级：{chapter.level}{extra}{materials}

写作要求：
1. 内容围绕本章节展开，语气正式、客观、专业。
2. 优先结合可参考的专业素材；如果素材不足，再结合电厂、专业、年份和报告主题进行合理表述。
3. 说明检查依据、检查情况、发现问题和整改建议，避免编造过于具体且无法验证的数据。
4. 不要重复输出章节标题，不要使用 Markdown 标题符号。
5. 正文控制在 300 到 600 字之间，适合后续导出 DOCX。
""".strip()


def generate_chapter_text(report: ReportRecord, chapter: ReportOutline, extra_prompt: str | None = None) -> str:
    prompt_note = f"{extra_prompt}" if extra_prompt else "结合检查依据、现场情况和整改闭环要求"
    plant = report.plant or "相关电厂"
    major = report.major or "相关专业"
    year = report.year or "本年度"
    topic = report.topic or "技术监督工作"
    return (
        f"本章节围绕“{chapter.title}”开展说明，结合{plant}{year}年度{major}专业的{topic}资料，"
        f"梳理本阶段技术监督工作的检查依据、检查过程、主要发现和整改建议。"
        f"从资料完整性、设备运行状态、问题闭环管理和风险防控措施等方面进行分析，"
        f"重点关注影响迎峰度夏、安全生产和持续稳定运行的关键环节。"
        f"针对检查中发现的薄弱项，应明确责任部门、整改期限和复查要求，"
        f"形成可跟踪、可验证、可闭环的整改措施。{prompt_note}。"
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