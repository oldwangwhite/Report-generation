export type ReportType = 'summerCheck' | 'coalInventoryAudit';

export type ReportStatus =
  | 'draft'
  | 'outlineGenerated'
  | 'generating'
  | 'generated'
  | 'exporting'
  | 'exported'
  | 'generateFailed'
  | 'exportFailed';

export type ChapterStatus = 'pending' | 'running' | 'done' | 'failed';

export type ContentType = 'text' | 'table' | 'image';

export type ExportFormat = 'docx' | 'pdf' | 'md' | 'txt';

/** 后端统一响应结构：成功时 code 按代码规约返回 200。 */
export interface ApiResponse<T> {
    code: number;
    data: T;
    message: string;
    traceId?: string;
}

export interface Report {
  reportId: string;
  reportName: string;
  reportType: ReportType;
  topic: string;
  major: string;
  plant: string;
  year: number;
  status: ReportStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Chapter {
  chapterId: string | null;
  reportId?: string;
  parentId: string | null;
  chapterNo: string;
  title: string;
  level: number;
  sortOrder: number;
  status: ChapterStatus;
  contentType?: ContentType;
}

export interface ChapterTable {
  tableId?: string | null;
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ChapterContent {
  chapterId: string;
  content: string;
  tables: ChapterTable[];
  manualEdited?: boolean;
  updatedAt?: string;
}

export interface ExportFile {
  exportId: string;
  reportId: string;
  fileName: string;
  fileFormat: ExportFormat;
  fileSize: number;
  downloadUrl: string;
  status: 'exporting' | 'exported' | 'exportFailed';
  createdAt: string;
}

export interface ReportDetail {
  report: Report;
  outline: Chapter[];
  contents: ChapterContent[];
  latestExport: ExportFile | null;
}

export interface Template {
  templateId: string;
  templateName: string;
  reportType: ReportType;
  fileName: string;
  status: 'enabled' | 'disabled';
}

export interface Material {
  materialId: string;
  materialName: string;
  major: string;
  fileName: string;
  fileSize: number;
  status: 'enabled' | 'disabled';
}

export interface CreateReportPayload {
  reportName: string;
  reportType: ReportType;
  topic: string;
  major: string;
  plant: string;
  year: number;
  templateId?: string;
  materialIds?: string[];
}

export interface StreamEvent {
  event: 'chapterStart' | 'chunk' | 'table' | 'progress' | 'chapterDone' | 'done' | 'error';
  reportId: string;
  chapterId?: string;
  chapterNo?: string;
  title?: string;
  contentDelta?: string;
  completedChapters?: number;
  totalChapters?: number;
  percent?: number;
  table?: ChapterTable;
  status?: ReportStatus | ChapterStatus;
  code?: number;
  message?: string;
}
