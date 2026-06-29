import { API_BASE, createAuthHeaders, requestJson } from './request';
import type {
    Chapter,
    ChapterContent,
    CreateReportPayload,
    ExportFile,
    ExportFormat,
    Material,
    Report,
    ReportDetail,
    StreamEvent,
    Template,
} from '../types/report';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const MOCK_TEMPLATES: Template[] = [
  {
    templateId: 'tpl_summer_001',
    templateName: '迎峰度夏检查报告模板',
    reportType: 'summerCheck',
    fileName: 'summer-check-template.docx',
    status: 'enabled',
  },
  {
    templateId: 'tpl_summer_002',
    templateName: '迎峰度夏安全监督简版模板',
    reportType: 'summerCheck',
    fileName: 'summer-check-simple.docx',
    status: 'enabled',
  },
  {
    templateId: 'tpl_coal_001',
    templateName: '煤库存审计报告模板',
    reportType: 'coalInventoryAudit',
    fileName: 'coal-inventory-audit.docx',
    status: 'enabled',
  },
  {
    templateId: 'tpl_coal_002',
    templateName: '煤库存盘点分析简版模板',
    reportType: 'coalInventoryAudit',
    fileName: 'coal-inventory-simple.docx',
    status: 'enabled',
  },
];

const MOCK_MATERIALS: Material[] = [
  {
    materialId: 'mat_001',
    materialName: '迎峰度夏检查标准.pdf',
    major: '电气',
    fileName: 'standard.pdf',
    fileSize: 1024000,
    status: 'enabled',
  },
  {
    materialId: 'mat_002',
    materialName: '设备运行月报.docx',
    major: '电气',
    fileName: 'run.docx',
    fileSize: 845600,
    status: 'enabled',
  },
];

const MOCK_OUTLINE: Chapter[] = [
  {
    chapterId: 'chap_001',
    parentId: null,
    chapterNo: '1',
    title: '检查概况',
    level: 1,
    sortOrder: 1,
    status: 'pending',
    contentType: 'text',
  },
  {
    chapterId: 'chap_002',
    parentId: 'chap_001',
    chapterNo: '1.1',
    title: '检查背景',
    level: 2,
    sortOrder: 1,
    status: 'pending',
    contentType: 'text',
  },
  {
    chapterId: 'chap_003',
    parentId: 'chap_001',
    chapterNo: '1.2',
    title: '检查范围',
    level: 2,
    sortOrder: 2,
    status: 'pending',
    contentType: 'text',
  },
  {
    chapterId: 'chap_004',
    parentId: null,
    chapterNo: '2',
    title: '重点检查内容',
    level: 1,
    sortOrder: 2,
    status: 'pending',
    contentType: 'text',
  },
  {
    chapterId: 'chap_005',
    parentId: 'chap_004',
    chapterNo: '2.1',
    title: '设备运行情况',
    level: 2,
    sortOrder: 1,
    status: 'pending',
    contentType: 'table',
  },
  {
    chapterId: 'chap_006',
    parentId: 'chap_004',
    chapterNo: '2.2',
    title: '安全隐患排查',
    level: 2,
    sortOrder: 2,
    status: 'pending',
    contentType: 'text',
  },
  {
    chapterId: 'chap_007',
    parentId: null,
    chapterNo: '3',
    title: '问题分析与整改建议',
    level: 1,
    sortOrder: 3,
    status: 'pending',
    contentType: 'text',
  },
  {
    chapterId: 'chap_008',
    parentId: null,
    chapterNo: '4',
    title: '结论',
    level: 1,
    sortOrder: 4,
    status: 'pending',
    contentType: 'text',
  },
];

function delay<T>(data: T, ms = 450): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(data), ms));
}

/** 查询可用报告模板。 */
export async function getTemplates(reportType?: string) {
  if (USE_MOCK) {
    return delay(reportType ? MOCK_TEMPLATES.filter((item) => item.reportType === reportType) : MOCK_TEMPLATES);
  }
  const query = reportType ? `?reportType=${reportType}` : '';
  return requestJson<{ items: Template[] }>(`/api/templates${query}`).then((data) => data.items);
}

/** 查询可关联的知识库素材。 */
export async function getMaterials(params?: { major?: string; keyword?: string }) {
  if (USE_MOCK) return delay(MOCK_MATERIALS);
  const search = new URLSearchParams(params as Record<string, string>).toString();
  return requestJson<{ items: Material[] }>(`/api/materials?${search}`).then((data) => data.items);
}

/** 创建报告基础任务。 */
export async function createReport(payload: CreateReportPayload): Promise<Report> {
  if (USE_MOCK) {
    return delay({
      reportId: `rpt_${Date.now()}`,
      reportName: payload.reportName,
      reportType: payload.reportType,
      topic: payload.topic,
      major: payload.major,
      plant: payload.plant,
      year: payload.year,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return requestJson<Report>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** 调用后端生成报告大纲。 */
export async function generateOutline(reportId: string, payload: { reportType: string; topic: string; templateId?: string }) {
  if (USE_MOCK) return delay(MOCK_OUTLINE.map((item) => ({ ...item, reportId })));
  return requestJson<{ reportId: string; outline: Chapter[] }>(`/api/reports/${reportId}/outline/generate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((data) => data.outline);
}

/** 保存拖动和编辑后的大纲结构。 */
export async function saveOutline(reportId: string, outline: Chapter[]) {
  if (USE_MOCK) return delay(outline.map((item, index) => ({ ...item, chapterId: item.chapterId || `chap_new_${index}` })));
  return requestJson<{ outline: Chapter[] }>(`/api/reports/${reportId}/outline`, {
    method: 'PUT',
    body: JSON.stringify({ outline }),
  }).then((data) => data.outline);
}

/** 保存单个章节内容。 */
export async function saveChapterContent(reportId: string, chapterId: string, content: ChapterContent) {
  if (USE_MOCK) return delay({ chapterId, status: 'done' as const, updatedAt: new Date().toISOString() });
  return requestJson<{ chapterId: string; status: string; updatedAt: string }>(
    `/api/reports/${reportId}/chapters/${chapterId}/content`,
    {
      method: 'PUT',
      body: JSON.stringify(content),
    },
  );
}

/** 查询报告详情，用于预览页刷新。 */
export async function getReportDetail(report: Report, outline: Chapter[], contents: ChapterContent[]): Promise<ReportDetail> {
  if (USE_MOCK) return delay({ report, outline, contents, latestExport: null });
  return requestJson<ReportDetail>(`/api/reports/${report.reportId}`);
}

/** 创建导出任务。 */
export async function createExport(reportId: string, fileFormat: ExportFormat, templateId?: string) {
  if (USE_MOCK) {
    return delay({
      exportId: `exp_${Date.now()}`,
      reportId,
      status: 'exporting' as const,
      fileFormat,
      fileName: `报告.${fileFormat}`,
      fileSize: 0,
      downloadUrl: '',
      createdAt: new Date().toISOString(),
    });
  }
  return requestJson<ExportFile>(`/api/reports/${reportId}/exports`, {
    method: 'POST',
    body: JSON.stringify({ templateId, fileFormat, useLatestSavedContent: true }),
  });
}

/** 查询导出任务状态。 */
export async function getExportStatus(reportId: string, exportId: string, fileFormat: ExportFormat) {
  if (USE_MOCK) {
    return delay({
      exportId,
      reportId,
      fileName: `智能报告.${fileFormat}`,
      fileFormat,
      fileSize: 245760,
      downloadUrl: `/api/reports/${reportId}/exports/${exportId}/download`,
      status: 'exported' as const,
      createdAt: new Date().toISOString(),
    }, 900);
  }
  return requestJson<ExportFile>(`/api/reports/${reportId}/exports/${exportId}`);
}

/** 下载导出文件；mock 模式直接生成本地文本文件，真实模式走后端 blob。 */
export async function downloadExportFile(file: ExportFile) {
  if (USE_MOCK) {
    const blob = new Blob(
      [
        `报告文件：${file.fileName}\n`,
        `报告编号：${file.reportId}\n`,
        `导出格式：${file.fileFormat}\n`,
        '这是前端 mock 下载文件，后续后端完成后会替换为真实 DOCX/PDF/MD/TXT 文件流。\n',
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    triggerBrowserDownload(blob, file.fileName);
    return;
  }

  const downloadUrl = file.downloadUrl.startsWith('http') ? file.downloadUrl : `${API_BASE}${file.downloadUrl}`;
  const response = await fetch(downloadUrl, {
    headers: createAuthHeaders(),
  });
  if (!response.ok) throw new Error('文件下载失败');
  const blob = await response.blob();
  triggerBrowserDownload(blob, file.fileName);
}

/** 触发浏览器保存文件。 */
function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** 流式生成报告正文，mock 模式用定时器模拟 SSE 数据。 */
export async function streamGenerateContent(
  reportId: string,
  outline: Chapter[],
  onEvent: (event: StreamEvent) => void,
  options?: { chapterIds?: string[]; regenerate?: boolean; forceOverwrite?: boolean; signal?: AbortSignal },
) {
  if (USE_MOCK) {
    const chapters = outline.filter((item) => {
      if (!item.chapterId) return false;
      if (options?.chapterIds?.length) return options.chapterIds.includes(item.chapterId);
      return true;
    });
    for (let index = 0; index < chapters.length; index += 1) {
      if (options?.signal?.aborted) throw new DOMException('生成已中断', 'AbortError');
      const chapter = chapters[index];
      onEvent({
        event: 'chapterStart',
        reportId,
        chapterId: chapter.chapterId || undefined,
        chapterNo: chapter.chapterNo,
        title: chapter.title,
      });
      const text = `${chapter.chapterNo} ${chapter.title}：本章节结合报告主题、专业素材和模板要求生成内容，重点体现电力行业检查报告的专业性、完整性和可导出性。`;
      for (let cursor = 0; cursor < text.length; cursor += 10) {
        if (options?.signal?.aborted) throw new DOMException('生成已中断', 'AbortError');
        await delay(null, 80);
        onEvent({
          event: 'chunk',
          reportId,
          chapterId: chapter.chapterId || undefined,
          contentDelta: text.slice(cursor, cursor + 10),
        });
      }
      onEvent({
        event: 'chapterDone',
        reportId,
        chapterId: chapter.chapterId || undefined,
        status: 'done',
      });
      onEvent({
        event: 'progress',
        reportId,
        completedChapters: index + 1,
        totalChapters: chapters.length,
        percent: Math.round(((index + 1) / chapters.length) * 100),
      });
    }
    onEvent({ event: 'done', reportId, status: 'generated' });
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...createAuthHeaders(),
  };

  const response = await fetch(`${API_BASE}/api/reports/${reportId}/content/generate`, {
    method: 'POST',
    headers,
    signal: options?.signal,
    body: JSON.stringify({
      chapterIds: options?.chapterIds || [],
      regenerate: options?.regenerate || false,
      forceOverwrite: options?.forceOverwrite || false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || '内容生成失败';
    try {
      const json = JSON.parse(text);
      message = json.message || json.detail || message;
    } catch {
      // Keep the raw text when the response is not JSON.
    }
    throw new Error(message);
  }
  if (!response.body) throw new Error('当前浏览器不支持流式读取');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';
    chunks.forEach((chunk) => {
      const eventLine = chunk.split('\n').find((line) => line.startsWith('event:'));
      const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'));
      if (!eventLine || !dataLine) return;
      onEvent({
        event: eventLine.replace('event:', '').trim() as StreamEvent['event'],
        ...JSON.parse(dataLine.replace('data:', '').trim()),
      });
    });
  }
}


