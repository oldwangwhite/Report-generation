import {
  CheckCircleOutlined,
  CloudDownloadOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createExport,
  createReport,
  downloadExportFile,
  generateOutline,
  getExportStatus,
  getMaterials,
  getReportDetail,
  getReportDetailById,
  getTemplates,
  saveChapterContent,
  saveOutline,
} from '../../services/reportService';
import { useReportSSE } from '../../hooks/useReportSSE';
import type {
  Chapter,
  ChapterContent,
  ContentType,
  CreateReportPayload,
  ExportFile,
  ExportFormat,
  Material,
  Report,
  ReportType,
  Template,
} from '../../types/report';
import './style.css';

const { Title, Text, Paragraph } = Typography;

const REPORT_TYPE_OPTIONS = [
  { label: '迎峰度夏检查报告', value: 'summerCheck' },
  { label: '煤库存审计报告', value: 'coalInventoryAudit' },
];

const MAJOR_OPTIONS = ['电气', '锅炉', '汽机', '燃料', '安全监督'].map((item) => ({ label: item, value: item }));

const CONTENT_TYPE_TEXT: Record<ContentType, string> = {
  text: '正文',
  table: '表格',
  image: '图片',
};

const REPORT_TYPE_TEXT: Record<ReportType, string> = {
  summerCheck: '迎峰度夏检查报告',
  coalInventoryAudit: '煤库存审计报告',
};

const REPORT_STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  outlineGenerated: '已生成大纲',
  generating: '生成中',
  generated: '已生成',
  exporting: '导出中',
  exported: '已导出',
  generateFailed: '生成失败',
  exportFailed: '导出失败',
};

/** 渲染章节生成状态标签。 */
function renderStatusTag(status: Chapter['status']) {
  const colorMap: Record<Chapter['status'], string> = {
    pending: 'default',
    running: 'processing',
    done: 'success',
    failed: 'error',
  };
  const textMap: Record<Chapter['status'], string> = {
    pending: '待生成',
    running: '生成中',
    done: '已完成',
    failed: '失败',
  };
  return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
}

/** 根据章节层级计算缩进样式。 */
function getChapterIndentStyle(chapter: Chapter) {
  return { paddingLeft: Math.max(chapter.level - 1, 0) * 28 };
}

/** 重新计算大纲编号和同级排序。 */
function renumberOutlineChapters(outline: Chapter[]) {
  const next = outline.map((item) => ({ ...item }));
  const ordered: Chapter[] = [];
  const visited = new Set<string>();
  const keyOf = (item: Chapter, index: number) => item.chapterId || `__row_${index}`;
  const assign = (parentId: string | null, prefix = '') => {
    next
      .map((item, index) => ({ item, index, key: keyOf(item, index) }))
      .filter(({ item }) => item.parentId === parentId)
      .sort((a, b) => a.item.sortOrder - b.item.sortOrder)
      .forEach(({ item, index, key }, siblingIndex) => {
        if (visited.has(key)) return;
        visited.add(key);
        item.chapterNo = prefix ? `${prefix}.${siblingIndex + 1}` : `${siblingIndex + 1}`;
        item.sortOrder = siblingIndex + 1;
        ordered.push(item);
        if (item.chapterId) assign(item.chapterId, item.chapterNo);
        if (!item.chapterId) assign(keyOf(item, index), item.chapterNo);
      });
  };
  assign(null);
  next.forEach((item) => {
    const key = item.chapterId || `__orphan_${ordered.length}`;
    if (!visited.has(key)) ordered.push(item);
  });
  return ordered;
}

function createTempChapterId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function hasManualEditedContent(contents: ChapterContent[], chapterIds?: string[]) {
  const chapterIdSet = new Set(chapterIds || []);
  return contents.some((item) => {
    if (chapterIdSet.size && !chapterIdSet.has(item.chapterId)) return false;
    return item.manualEdited && (item.content?.trim() || item.tables?.length);
  });
}

function flattenTemplateOutline(structure?: Record<string, unknown>) {
  const outline = Array.isArray(structure?.outline) ? structure.outline : [];
  const rows: string[] = [];
  const walk = (nodes: unknown[], prefix = '') => {
    nodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') return;
      const item = node as { title?: unknown; children?: unknown[] };
      const no = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      if (typeof item.title === 'string') rows.push(`${no} ${item.title}`);
      if (Array.isArray(item.children)) walk(item.children, no);
    });
  };
  walk(outline);
  return rows.slice(0, 8);
}

/** 用户端报告生成主页面。 */
export default function ReportGenerationPage() {
  const [activeTab, setActiveTab] = useState('create');
  const [step, setStep] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState<Report | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [outline, setOutline] = useState<Chapter[]>([]);
  const [contents, setContents] = useState<ChapterContent[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [latestExport, setLatestExport] = useState<ExportFile | null>(null);
  const [dragChapterId, setDragChapterId] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const resumedReportId = searchParams.get('reportId');
  const [form] = Form.useForm<CreateReportPayload>();

  const selectedChapter = outline.find((item) => item.chapterId === selectedChapterId) || outline[0];
  const selectedContent = selectedChapter
    ? contents.find((item) => item.chapterId === selectedChapter.chapterId)
    : undefined;

  const { generating, percent, progressText, generate, cancelGenerate } = useReportSSE({
    report,
    outline,
    contents,
    setOutline,
    setContents,
  });

  useEffect(() => {
    getTemplates().then(setTemplates);
    getMaterials().then(setMaterials);
  }, []);


  useEffect(() => {
    if (!resumedReportId) return;
    let ignore = false;

    const restoreReport = async () => {
      setRecovering(true);
      try {
        const detail = await getReportDetailById(resumedReportId);
        if (ignore) return;
        setReport(detail.report);
        setOutline(detail.outline || []);
        setContents(detail.contents || []);
        setLatestExport(detail.latestExport || null);
        setSelectedChapterId(detail.outline?.[0]?.chapterId || '');
        form.setFieldsValue({
          reportName: detail.report.reportName,
          reportType: detail.report.reportType,
          topic: detail.report.topic || '',
          major: detail.report.major || '',
          plant: detail.report.plant || '',
          year: detail.report.year,
          templateId: detail.report.templateId || undefined,
          materialIds: detail.report.materialIds || [],
        });

        const hasContent = detail.contents?.some((item) => item.content?.trim() || item.tables?.length) || false;
        if (detail.latestExport || detail.report.status === 'exported') {
          setStep(3);
          setActiveTab('preview');
        } else if (detail.report.status === 'generated') {
          setStep(3);
          setActiveTab('create');
        } else if (hasContent || detail.report.status === 'generating' || detail.report.status === 'generateFailed') {
          setStep(2);
          setActiveTab('create');
        } else if (detail.outline?.length) {
          setStep(1);
          setActiveTab('create');
        } else {
          setStep(0);
          setActiveTab('create');
        }
        message.success('已恢复上次报告任务，可以继续生成或导出');
      } catch (error) {
        if (!ignore) message.error(error instanceof Error ? error.message : '恢复报告任务失败');
      } finally {
        if (!ignore) setRecovering(false);
      }
    };

    restoreReport();
    return () => {
      ignore = true;
    };
  }, [resumedReportId, form]);

  useEffect(() => {
    if (!selectedChapterId && outline[0]?.chapterId) {
      setSelectedChapterId(outline[0].chapterId);
    }
  }, [outline, selectedChapterId]);

  const watchedReportName = Form.useWatch('reportName', form) as string | undefined;
  const watchedReportType = Form.useWatch('reportType', form) as ReportType | undefined;
  const watchedPlant = Form.useWatch('plant', form) as string | undefined;
  const watchedMajor = Form.useWatch('major', form) as string | undefined;
  const watchedYear = Form.useWatch('year', form) as number | undefined;
  const watchedTemplateId = Form.useWatch('templateId', form) as string | undefined;
  const watchedMaterialIds = Form.useWatch('materialIds', form) as string[] | undefined;

  const currentTemplates = useMemo(() => {
    return watchedReportType ? templates.filter((item) => item.reportType === watchedReportType) : templates;
  }, [templates, watchedReportType]);

  const currentMaterials = useMemo(() => {
    const enabled = materials.filter((item) => item.status === 'enabled');
    return watchedMajor
      ? enabled.filter((item) => !item.major || item.major === watchedMajor || ['综合', '通用', 'general', 'common'].includes(item.major))
      : enabled;
  }, [materials, watchedMajor]);

  useEffect(() => {
    if (!watchedTemplateId) return;
    const template = templates.find((item) => item.templateId === watchedTemplateId);
    if (template && watchedReportType && template.reportType !== watchedReportType) {
      form.setFieldValue('templateId', undefined);
      message.info('报告类型已切换，已清空不匹配的模板');
    }
  }, [form, templates, watchedReportType, watchedTemplateId]);

  useEffect(() => {
    if (!watchedMaterialIds?.length) return;
    const allowed = new Set(currentMaterials.map((item) => item.materialId));
    const nextIds = watchedMaterialIds.filter((item) => allowed.has(item));
    if (nextIds.length !== watchedMaterialIds.length) {
      form.setFieldValue('materialIds', nextIds);
      message.info('专业已切换，已清空不匹配的素材');
    }
  }, [currentMaterials, form, watchedMaterialIds]);

  const selectedTemplate = templates.find((item) => item.templateId === watchedTemplateId);
  const selectedTemplateOutline = flattenTemplateOutline(selectedTemplate?.structure);
  const selectedMaterials = materials.filter((item) => watchedMaterialIds?.includes(item.materialId));
  const doneChapters = outline.filter((item) => item.status === 'done').length;
  const failedChapters = outline.filter((item) => item.status === 'failed').length;
  const generatedContents = contents.filter((item) => item.content?.trim()).length;

  const stepItems = [
    { title: '基础信息', description: report ? '已创建' : '填写中', status: report ? 'finish' : step === 0 ? 'process' : 'wait' },
    { title: '大纲生成与编辑', description: outline.length ? `${outline.length} 个章节` : '待生成', status: outline.length ? 'finish' : step === 1 ? 'process' : 'wait' },
    {
      title: '章节内容生成',
      description: outline.length ? `${doneChapters}/${outline.length} 已完成` : '待生成',
      status: failedChapters ? 'error' : doneChapters ? 'finish' : step === 2 ? 'process' : 'wait',
    },
    { title: '预览导出', description: latestExport ? '已有文件' : '待导出', status: latestExport ? 'finish' : step === 3 ? 'process' : 'wait' },
  ] as const;

  const handleNewReport = () => {
    setActiveTab('create');
    setStep(0);
    setReport(null);
    setOutline([]);
    setContents([]);
    setSelectedChapterId('');
    setLatestExport(null);
    form.resetFields();
    if (resumedReportId) navigate(location.pathname, { replace: true });
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    const created = await createReport(values);
    const fullReport = { ...values, ...created };
    setReport(fullReport);
    setStep(1);
    message.success('报告创建成功');
    return fullReport;
  };

  const handleGenerateOutline = async () => {
    const currentReport = report || (await handleCreate());
    const values = form.getFieldsValue();
    const nextOutline = await generateOutline(currentReport.reportId, {
      reportType: currentReport.reportType,
      topic: currentReport.topic || values.topic,
      templateId: values.templateId,
      materialIds: values.materialIds || [],
    });
    setOutline(nextOutline);
    setSelectedChapterId(nextOutline[0]?.chapterId || '');
    setStep(1);
    message.success('大纲生成成功');
  };

  const handleSaveOutline = async () => {
    if (!report) return;
    const saved = await saveOutline(report.reportId, outline);
    setOutline(saved);
    message.success('大纲已保存');
  };

  const moveChapter = (chapterId: string | null, direction: 'up' | 'down') => {
    const current = outline.find((item) => item.chapterId === chapterId);
    if (!current) return;
    const siblings = outline
      .filter((item) => item.parentId === current.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((item) => item.chapterId === chapterId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    const target = siblings[targetIndex];
    const next = outline.map((item) => {
      if (item.chapterId === current.chapterId) return { ...item, sortOrder: target.sortOrder };
      if (item.chapterId === target.chapterId) return { ...item, sortOrder: current.sortOrder };
      return item;
    });
    setOutline(renumberOutlineChapters(next));
  };

  const handleDropChapter = (targetChapterId: string | null) => {
    if (!dragChapterId || !targetChapterId || dragChapterId === targetChapterId) return;
    const source = outline.find((item) => item.chapterId === dragChapterId);
    const target = outline.find((item) => item.chapterId === targetChapterId);
    if (!source || !target) return;
    if (source.parentId !== target.parentId) {
      message.info('当前演示版支持同级章节拖动排序，跨层级可通过新增/删除章节调整');
      setDragChapterId(null);
      return;
    }
    const siblings = outline
      .filter((item) => item.parentId === source.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const from = siblings.findIndex((item) => item.chapterId === source.chapterId);
    const to = siblings.findIndex((item) => item.chapterId === target.chapterId);
    const reordered = [...siblings];
    const [picked] = reordered.splice(from, 1);
    reordered.splice(to, 0, picked);
    const orderMap = new Map(reordered.map((item, index) => [item.chapterId, index + 1]));
    setOutline(
      renumberOutlineChapters(
        outline.map((item) =>
          orderMap.has(item.chapterId) ? { ...item, sortOrder: orderMap.get(item.chapterId)! } : item,
        ),
      ),
    );
    setDragChapterId(null);
  };

  const addChapter = (parentId: string | null = null) => {
    const parent = parentId ? outline.find((item) => item.chapterId === parentId) : null;
    const siblings = outline.filter((item) => item.parentId === parentId);
    const draft: Chapter = {
      chapterId: createTempChapterId(),
      parentId,
      chapterNo: '',
      title: '新增章节',
      level: parent ? parent.level + 1 : 1,
      sortOrder: siblings.length + 1,
      status: 'pending',
      contentType: 'text',
    };
    setOutline(renumberOutlineChapters([...outline, draft]));
  };

  const updateChapter = (chapterId: string | null, patch: Partial<Chapter>) => {
    setOutline(outline.map((item) => (item.chapterId === chapterId ? { ...item, ...patch } : item)));
  };

  const deleteChapter = (chapterId: string | null) => {
    const removeIds = new Set<string | null>([chapterId]);
    let changed = true;
    while (changed) {
      changed = false;
      outline.forEach((item) => {
        if (removeIds.has(item.parentId) && !removeIds.has(item.chapterId)) {
          removeIds.add(item.chapterId);
          changed = true;
        }
      });
    }
    setOutline(renumberOutlineChapters(outline.filter((item) => !removeIds.has(item.chapterId))));
  };

  const handleContinueGenerate = () => {
    const pendingChapterIds = outline
      .filter((item) => item.chapterId && item.status !== 'done')
      .map((item) => item.chapterId!)
      .filter(Boolean);
    if (!pendingChapterIds.length) {
      message.info('当前没有待生成章节，如需重写请使用“重新生成全文”');
      return;
    }
    generate({ chapterIds: pendingChapterIds });
  };

  const generateWithConfirm = (options?: { chapterIds?: string[]; regenerate?: boolean; forceOverwrite?: boolean }) => {
    if (!options?.forceOverwrite || !hasManualEditedContent(contents, options.chapterIds)) {
      generate(options);
      return;
    }
    Modal.confirm({
      title: '确认重新生成？',
      content: '选中的章节包含人工编辑内容，重新生成会清空并覆盖这些内容。是否继续？',
      okText: '确认覆盖',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => generate(options),
    });
  };

  const handleSaveContent = async () => {
    if (!report || !selectedChapter?.chapterId) return;
    const content = selectedContent || { chapterId: selectedChapter.chapterId, content: '', tables: [] };
    await saveChapterContent(report.reportId, selectedChapter.chapterId, { ...content, manualEdited: true });
    message.success('章节内容已保存');
  };

  const updateSelectedContent = (value: string) => {
    if (!selectedChapter?.chapterId) return;
    const next: ChapterContent = {
      chapterId: selectedChapter.chapterId,
      content: value,
      tables: selectedContent?.tables || [],
      manualEdited: true,
    };
    setContents([...contents.filter((item) => item.chapterId !== selectedChapter.chapterId), next]);
  };

  const handleExport = async (fileFormat: ExportFormat) => {
    if (!report) {
      message.warning('请先创建报告');
      return;
    }
    if (!outline.length) {
      message.warning('请先生成大纲和正文后再导出');
      return;
    }
    const unfinishedCount = outline.filter((item) => item.status !== 'done').length;
    if (unfinishedCount > 0) {
      Modal.confirm({
        title: '报告内容尚未完整生成',
        content: `当前还有 ${unfinishedCount} 个章节未生成，导出文件会包含空章节提示。是否继续导出？`,
        okText: '继续导出',
        cancelText: '返回检查',
        onOk: () => doExport(fileFormat),
      });
      return;
    }
    await doExport(fileFormat);
  };

  const doExport = async (fileFormat: ExportFormat) => {
    setExporting(true);
    try {
      const values = form.getFieldsValue();
      const task = await createExport(report!.reportId, fileFormat, values.templateId);
      const result = await getExportStatus(report!.reportId, task.exportId, fileFormat);
      setLatestExport(result);
      message.success(
        result.hasIncompleteContent
          ? `${fileFormat.toUpperCase()} 导出完成，仍有 ${result.incompleteChapterCount || 0} 个章节未生成`
          : `${fileFormat.toUpperCase()} 导出完成`,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleLoadPreview = async () => {
    if (!report) return;
    const detail = await getReportDetail(report, outline, contents);
    setLatestExport(detail.latestExport);
  };

  return (
    <main className="report-page">
      <section className="report-hero compact-hero">
        <div className="hero-copy">
          <Text type="secondary">报告生成 / 用户端流程</Text>
          <Title level={2}>报告生成工作台</Title>
          <Paragraph>按基础信息、模板素材、大纲、正文和导出组织完整流程。</Paragraph>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            重置
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNewReport}>
            新建报告
          </Button>
        </Space>
      </section>

      {resumedReportId && (
        <Alert
          className="resume-alert"
          type="success"
          showIcon
          message={recovering ? '正在恢复报告任务...' : `已进入历史报告：${resumedReportId}`}
          description="页面会自动拉取报告基础信息、大纲、章节正文和最新导出文件；中断后可继续生成未完成章节。"
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'create', label: '新建报告流程' },
          { key: 'preview', label: '预览与导出' },
        ]}
      />

      {activeTab === 'create' && (
        <>
          <Card className="flow-card">
            <Steps
              current={step}
              onChange={setStep}
              items={stepItems.map((item) => ({ ...item }))}
            />
          </Card>

          {step === 0 && (
            <Row gutter={16}>
              <Col span={16}>
                <Card className="form-card" title={<Space><FileTextOutlined />报告基础信息</Space>} extra={<Text type="secondary">选择模板与素材后再生成，效果更稳定</Text>}>
                  <Form
                    layout="vertical"
                    form={form}
                    initialValues={{
                      reportName: 'XX电厂迎峰度夏检查报告',
                      reportType: 'summerCheck',
                      topic: '迎峰度夏安全检查',
                      major: '电气',
                      plant: 'XX电厂',
                      year: 2026,
                    }}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="reportName" label="报告名称" rules={[{ required: true }]}>
                          <Input placeholder="请输入报告名称" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="reportType" label="报告类型" rules={[{ required: true }]}>
                          <Select options={REPORT_TYPE_OPTIONS} placeholder="请选择报告类型" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="plant" label="电厂" rules={[{ required: true }]}>
                          <Input placeholder="例如：XX电厂" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="major" label="专业" rules={[{ required: true }]}>
                          <Select options={MAJOR_OPTIONS} placeholder="请选择专业" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="year" label="年份" rules={[{ required: true }]}>
                          <InputNumber min={2020} max={2035} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name="topic" label="报告主题" rules={[{ required: true }]}>
                          <Input.TextArea rows={4} placeholder="简要描述本次报告主题、检查目标或重点范围" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="templateId" label="报告模板">
                          <Select
                            allowClear
                            placeholder={currentTemplates.length ? '可选择导出模板' : '当前类型暂无模板'}
                            options={currentTemplates.map((item) => ({
                              label: item.templateName,
                              value: item.templateId,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="materialIds" label="关联素材">
                          <Select
                            mode="multiple"
                            placeholder={currentMaterials.length ? '选择本次生成要参考的素材' : '当前专业暂无启用素材'}
                            options={currentMaterials.map((item) => ({
                              label: item.major ? `${item.materialName}（${item.major}）` : item.materialName,
                              value: item.materialId,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <div className="selection-hints">
                      <Alert
                        type={selectedTemplate ? 'success' : 'info'}
                        showIcon
                        message={selectedTemplate ? `已选择模板：${selectedTemplate.templateName}` : '未选择模板时，系统会使用当前报告类型的默认导出样式。'}
                        description={
                          selectedTemplateOutline.length ? (
                            <div className="template-outline-preview">
                              {selectedTemplateOutline.map((item) => (
                                <span key={item}>{item}</span>
                              ))}
                            </div>
                          ) : undefined
                        }
                      />
                      <Alert
                        type={selectedMaterials.length ? 'success' : 'warning'}
                        showIcon
                        message={selectedMaterials.length ? `已关联 ${selectedMaterials.length} 个素材，生成正文时会作为参考。` : '未关联素材时，正文将主要依据基础信息和模型能力生成。'}
                      />
                    </div>
                    <Space wrap>
                      <Button icon={<CheckCircleOutlined />} onClick={handleCreate}>
                        保存基础信息
                      </Button>
                      <Button type="primary" icon={<FileTextOutlined />} onClick={handleGenerateOutline}>
                        下一步：创建并生成大纲
                      </Button>
                    </Space>
                  </Form>
                </Card>
              </Col>
              <Col span={8}>
                <Card className="task-card" title="当前任务" extra={<Tag color={report ? 'processing' : 'default'}>{report ? '进行中' : '未创建'}</Tag>}>
                  <div className="task-summary">
                    <div>
                      <Text type="secondary">报告名称</Text>
                      <Title level={5}>{report?.reportName || watchedReportName || '未创建报告'}</Title>
                    </div>
                    <Progress percent={outline.length ? Math.round((doneChapters / outline.length) * 100) : 0} size="small" />
                  </div>
                  <List
                    className="task-list"
                    dataSource={[
                      ['报告 ID', report?.reportId || '未创建'],
                      ['报告状态', report?.status ? REPORT_STATUS_TEXT[report.status] || report.status : '未创建'],
                      ['报告类型', watchedReportType ? REPORT_TYPE_TEXT[watchedReportType] : '-'],
                      ['电厂 / 专业', `${watchedPlant || '-'} / ${watchedMajor || '-'}`],
                      ['年份', `${watchedYear || '-'}`],
                      ['已选模板', selectedTemplate?.templateName || '默认模板'],
                      ['关联素材', selectedMaterials.length ? `${selectedMaterials.length} 个` : '未选择'],
                      ['大纲章节', outline.length ? `${outline.length} 个` : '未生成'],
                      ['正文进度', outline.length ? `${doneChapters}/${outline.length} 章` : `${generatedContents} 段内容`],
                    ]}
                    renderItem={(item) => (
                      <List.Item>
                        <Text type="secondary">{item[0]}</Text>
                        <Text strong>{item[1]}</Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {step === 1 && (
            <Card
              title="大纲生成与编辑页面"
              extra={
                <Space>
                  <Button icon={<PlusOutlined />} onClick={() => addChapter(null)}>
                    新增一级章节
                  </Button>
                  <Button icon={<FileTextOutlined />} onClick={handleGenerateOutline}>
                    重新生成大纲
                  </Button>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveOutline}>
                    保存大纲
                  </Button>
                </Space>
              }
            >
              <div className="outline-editor">
                {outline.map((record) => (
                  <div
                    key={record.chapterId || `${record.title}-${record.sortOrder}`}
                    className={`outline-row ${dragChapterId === record.chapterId ? 'dragging' : ''}`}
                    draggable={Boolean(record.chapterId)}
                    onDragStart={() => setDragChapterId(record.chapterId)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDropChapter(record.chapterId)}
                    style={getChapterIndentStyle(record)}
                  >
                    <span className="drag-handle">拖动</span>
                    <Text strong className="chapter-no">
                      {record.chapterNo}
                    </Text>
                    <Input
                      value={record.title}
                      onChange={(event) => updateChapter(record.chapterId, { title: event.target.value })}
                    />
                    <Select
                      value={record.contentType || 'text'}
                      className="content-type-select"
                      options={[
                        { label: '正文', value: 'text' },
                        { label: '表格', value: 'table' },
                        { label: '图片', value: 'image' },
                      ]}
                      onChange={(value) => updateChapter(record.chapterId, { contentType: value })}
                    />
                    {renderStatusTag(record.status)}
                    <Button onClick={() => addChapter(record.chapterId)} disabled={record.level >= 3}>
                      加子节
                    </Button>
                    <Button onClick={() => moveChapter(record.chapterId, 'up')}>上移</Button>
                    <Button onClick={() => moveChapter(record.chapterId, 'down')}>下移</Button>
                    <Button danger onClick={() => deleteChapter(record.chapterId)}>
                      删除
                    </Button>
                  </div>
                ))}
              </div>
              <Divider />
              <Text type="secondary">
                拖动需求可在正式开发时接入 dnd-kit 或 react-beautiful-dnd；当前版本先提供上移、下移、改父级数据结构保存，接口已按拖动后的 parentId/level/sortOrder 设计。
              </Text>
              <div className="footer-actions">
                <Button type="primary" onClick={() => setStep(2)}>
                  下一步：章节内容生成
                </Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Row gutter={16}>
              <Col span={6}>
                <Card title="章节目录">
                  <List
                    dataSource={outline}
                    renderItem={(item) => (
                      <List.Item
                        className={item.chapterId === selectedChapter?.chapterId ? 'chapter-active' : ''}
                        onClick={() => item.chapterId && setSelectedChapterId(item.chapterId)}
                      >
                        <Space style={getChapterIndentStyle(item)}>
                          <span>{item.chapterNo}</span>
                          <span>{item.title}</span>
                          {renderStatusTag(item.status)}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  title={selectedChapter ? `${selectedChapter.chapterNo} ${selectedChapter.title}` : '章节内容'}
                  extra={selectedChapter ? <Tag>{CONTENT_TYPE_TEXT[selectedChapter.contentType || 'text']}</Tag> : null}
                >
                  <Input.TextArea
                    rows={18}
                    value={selectedContent?.content || ''}
                    onChange={(event) => updateSelectedContent(event.target.value)}
                    placeholder="流式生成内容会显示在这里，也可以手动编辑。"
                  />
                  <Space className="editor-actions">
                    <Button icon={<PlayCircleOutlined />} onClick={() => selectedChapter?.chapterId && generate({ chapterIds: [selectedChapter.chapterId] })}>
                      生成当前章节
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={() => selectedChapter?.chapterId && generateWithConfirm({ chapterIds: [selectedChapter.chapterId], regenerate: true, forceOverwrite: true })}>
                      重新生成章节
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveContent}>
                      保存当前章节
                    </Button>
                  </Space>
                </Card>
              </Col>
              <Col span={6}>
                <Card title="生成进度">
                  <Progress percent={percent} status={generating ? 'active' : 'normal'} />
                  <Paragraph>{progressText}</Paragraph>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" block loading={generating} onClick={handleContinueGenerate}>
                      继续生成未完成章节
                    </Button>
                    <Button block loading={generating} onClick={() => generateWithConfirm({ regenerate: true, forceOverwrite: true })}>
                      重新生成全文
                    </Button>
                    {generating && (
                      <Button danger block onClick={cancelGenerate}>
                        取消生成
                      </Button>
                    )}
                    <Button block onClick={() => setStep(3)}>
                      下一步：预览导出
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          )}

          {step === 3 && (
            <PreviewPanel
              report={report}
              outline={outline}
              contents={contents}
              exporting={exporting}
              latestExport={latestExport}
              onLoadPreview={handleLoadPreview}
              onExport={handleExport}
            />
          )}
        </>
      )}

      {activeTab === 'preview' && (
        <PreviewPanel
          report={report}
          outline={outline}
          contents={contents}
          exporting={exporting}
          latestExport={latestExport}
          onLoadPreview={handleLoadPreview}
          onExport={handleExport}
        />
      )}
    </main>
  );
}

/** 报告预览和导出区域。 */
function PreviewPanel(props: {
  report: Report | null;
  outline: Chapter[];
  contents: ChapterContent[];
  exporting: boolean;
  latestExport: ExportFile | null;
  onLoadPreview: () => void;
  onExport: (format: ExportFormat) => void;
}) {
  const [format, setFormat] = useState<ExportFormat>('docx');

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card title="导出设置">
          <Radio.Group value={format} onChange={(event) => setFormat(event.target.value)}>
            <Space direction="vertical">
              <Radio value="docx">DOCX Word</Radio>
              <Radio value="md">Markdown</Radio>
              <Radio value="txt">TXT 文本</Radio>
            </Space>
          </Radio.Group>
          <Divider />
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button block onClick={props.onLoadPreview}>
              刷新预览
            </Button>
            <Button type="primary" block loading={props.exporting} icon={<CloudDownloadOutlined />} onClick={() => props.onExport(format)}>
              导出 {format.toUpperCase()}
            </Button>
            <Button
              block
              disabled={!props.latestExport}
              onClick={async () => {
                if (!props.latestExport) return;
                await downloadExportFile(props.latestExport);
                message.success(`已开始下载：${props.latestExport.fileName}`);
              }}
            >
              下载最新文件
            </Button>
          </Space>
          {props.latestExport && (
            <Paragraph className="export-info">
              最新文件：{props.latestExport.fileName}
              <br />
              状态：{props.latestExport.status}
            </Paragraph>
          )}
        </Card>
      </Col>
      <Col span={18}>
        <Card title="报告预览">
          <article className="report-preview">
            <Title level={2}>{props.report?.reportName || '未创建报告'}</Title>
            <Paragraph>
              <Text strong>电厂：</Text>{props.report?.plant || '-'}　<Text strong>专业：</Text>{props.report?.major || '-'}　<Text strong>年份：</Text>
              {props.report?.year || '-'}
            </Paragraph>
            <Divider />
            {props.outline.map((chapter) => {
              const content = props.contents.find((item) => item.chapterId === chapter.chapterId);
              return (
                <section key={chapter.chapterId || chapter.title} className={`preview-level-${chapter.level}`}>
                  <Title level={Math.min(chapter.level + 2, 5) as 3 | 4 | 5}>
                    {chapter.chapterNo} {chapter.title}
                  </Title>
                  <Paragraph>{content?.content || '该章节尚未生成内容。'}</Paragraph>
                  {content?.tables.map((table) => (
                    <Table
                      key={table.tableId}
                      size="small"
                      pagination={false}
                      dataSource={table.rows.map((row, index) => ({ key: index, row }))}
                      columns={table.headers.map((header, index) => ({
                        title: header,
                        dataIndex: ['row', index],
                      }))}
                    />
                  ))}
                </section>
              );
            })}
          </article>
        </Card>
      </Col>
    </Row>
  );
}
