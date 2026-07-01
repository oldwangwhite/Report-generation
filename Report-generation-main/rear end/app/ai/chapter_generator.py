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
    topic = report.topic or "未指定主题"
    plant = report.plant or "未指定电厂"
    major = report.major or "相关专业"
    year = report.year or "未指定年份"
    extra = f"\n补充要求：{extra_prompt}" if extra_prompt else ""
    materials = f"\n\n可参考的用户选定素材：\n{material_context}" if material_context else ""
    return f"""
请生成一段正式、客观、可直接放入技术监督报告的中文正文。

报告类型：{report_type}
报告主题：{topic}
电厂：{plant}
专业：{major}
年份：{year}
章节编号：{chapter.chapter_no}
章节标题：{chapter.title}
章节层级：{chapter.level}{extra}{materials}

写作要求：
1. 内容必须围绕本章节展开，语气正式、客观、专业。
2. 优先结合“用户选定素材”中的事实、术语和检查项；素材不足时再结合报告主题合理表述。
3. 可说明检查依据、检查情况、发现问题、风险影响和整改建议，但不要编造无法验证的具体数值。
4. 不要重复输出章节标题，不要使用 Markdown 标题符号。
5. 正文控制在 300 到 600 字之间，适合后续导出 DOCX。
""".strip()


def generate_chapter_text(
    report: ReportRecord,
    chapter: ReportOutline,
    extra_prompt: str | None = None,
) -> str:
    prompt_note = extra_prompt or "结合检查依据、现场情况和整改闭环要求"
    plant = report.plant or "相关电厂"
    major = report.major or "相关专业"
    year = report.year or "本年度"
    topic = report.topic or "技术监督工作"
    return (
        f"本章节围绕“{chapter.title}”展开，结合{plant}{year}年度{major}专业的{topic}资料，"
        "梳理本阶段技术监督工作的检查依据、检查过程、主要发现和整改建议。"
        "检查重点包括资料完整性、设备运行状态、问题闭环管理和风险防控措施等方面，"
        "应关注可能影响迎峰度夏、安全生产和持续稳定运行的关键环节。"
        "对检查中发现的薄弱项，应明确责任部门、整改期限和复查要求，"
        "形成可跟踪、可验证、可闭环的整改措施。"
        f"{prompt_note}。"
    ).strip()


def generate_table(report: ReportRecord, chapter: ReportOutline, content: str | None = None) -> dict:
    plant = report.plant or "相关电厂"
    major = report.major or "相关专业"
    topic = chapter.title
    summary = _summarize_content(content)
    return {
        "tableId": f"tbl_{chapter.id:03d}",
        "title": f"{chapter.chapter_no} {chapter.title}检查情况表",
        "headers": ["序号", "检查项", "发现情况", "风险等级", "整改建议", "责任部门", "完成期限"],
        "rows": [
            [
                "1",
                f"{topic}资料核查",
                summary or f"{plant}{major}相关资料需持续完善。",
                "中",
                "补充完善台账、记录和佐证材料，确保资料可追溯。",
                f"{major}专业",
                "15日内",
            ],
            [
                "2",
                f"{topic}现场检查",
                "现场检查未见重大异常，个别检查项需结合运行记录继续跟踪。",
                "低",
                "建立问题清单，按计划完成复查和销号。",
                "运行维护部门",
                "30日内",
            ],
            [
                "3",
                f"{topic}闭环管理",
                "整改责任、期限和复查要求需在报告后续章节中持续固化。",
                "中",
                "明确责任人和完成节点，形成闭环验证记录。",
                "生产技术部门",
                "45日内",
            ],
        ],
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


def _summarize_content(content: str | None) -> str:
    if not content:
        return ""
    compact = " ".join(content.split())
    return compact[:70] + ("..." if len(compact) > 70 else "")
