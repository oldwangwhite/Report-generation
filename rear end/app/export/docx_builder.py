from pathlib import Path

from docx import Document


class DocxBuilder:
    def build(self, report, outline: list, contents_by_chapter: dict[int, object], path: Path) -> None:
        document = Document()
        document.add_heading(report.report_name, level=0)
        document.add_paragraph(f"报告类型：{report.report_type}")
        document.add_paragraph(f"主题：{report.topic}")
        document.add_paragraph(f"电厂：{report.plant or ''}")
        document.add_paragraph(f"专业：{report.major or ''}")
        document.add_paragraph(f"年份：{report.year or ''}")

        for chapter in outline:
            level = min(max(chapter.level, 1), 4)
            document.add_heading(f"{chapter.chapter_no} {chapter.title}", level=level)
            content = contents_by_chapter.get(chapter.id)
            if content and content.content:
                document.add_paragraph(content.content)
            else:
                document.add_paragraph("本章节暂无保存内容。")
            for table_data in (content.tables if content else []) or []:
                document.add_paragraph(table_data.get("title", "表格"))
                headers = table_data.get("headers", [])
                rows = table_data.get("rows", [])
                table = document.add_table(rows=1, cols=max(len(headers), 1))
                table.style = "Table Grid"
                for index, header in enumerate(headers or ["内容"]):
                    table.rows[0].cells[index].text = header
                for row_data in rows:
                    row = table.add_row()
                    for index, value in enumerate(row_data[: len(table.columns)]):
                        row.cells[index].text = value

        document.save(path)
