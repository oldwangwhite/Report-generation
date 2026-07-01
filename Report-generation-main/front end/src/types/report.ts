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

export type ExportFormat = 'docx' | 'md' | 'txt';

/** 后端统一响应结构：成功时 code 按代码规约返回 200。 */
export interface ApiResponse<T> {
    code: number;
    data: T;
    message: string;
    traceId?: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface Report {
  reportId: string;
  reportName: string;
  reportType: ReportType;
  topic?: string;
  major?: string;
  plant?: string;
  year?: number;
  templateId?: string | null;
  materialIds?: string[];
  status: ReportStatus;
  createdBy?: string;
  createdAt?: string;
  generatedAt?: string;
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
  structure?: Record<string, unknown>;
  status: 'enabled' | 'disabled';
  createdBy?: string;
  createdAt?: string;
}

export interface Material {
  materialId: string;
  materialName: string;
  materialType?: string;
  major?: string;
  fileName: string;
  fileSize: number;
  fileType?: string;
  description?: string;
  parseSupported?: boolean;
  parseStatus?: 'supported' | 'uploaded_only';
  parseMessage?: string;
  status: 'enabled' | 'disabled';
  createdBy?: string;
  createdAt?: string;
}

export interface ModelConfig {
  configId?: string;
  apiUrl: string;
  modelName: string;
  apiKey?: string;
  apiKeyMasked?: string;
  timeoutSeconds: number;
  enabled: boolean;
  updatedAt?: string;
}

export interface ManagedUser {
  userId: string;
  username: string;
  displayName: string;
  role: 'user' | 'admin' | 'super_admin';
  status: 'enabled' | 'disabled';
  createdAt?: string;
}


export interface PermissionDefinition {
  code: string;
  name: string;
  description?: string;
}

export interface RolePermissionItem {
  role: 'user' | 'admin' | 'super_admin';
  roleName: string;
  permissionCodes: string[];
}

export interface RolePermissionsResult {
  availablePermissions: PermissionDefinition[];
  roles: RolePermissionItem[];
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
