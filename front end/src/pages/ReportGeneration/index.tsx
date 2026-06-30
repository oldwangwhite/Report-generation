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
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  message,
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
import {
  createExport,
  createReport,
  downloadExportFile,
  generateOutline,
  getExportStatus,
  getMaterials,
  getReportDetail,
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
  const assign = (parentId: string | null, prefix = '') => {
    next
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((item, index) => {
        item.chapterNo = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
        item.sortOrder = index + 1;
        assign(item.chapterId, item.chapterNo);
      });
  };
  assign(null);
  return next;
}

/** 用户端报告生成主页面。 */
export default function ReportGenerationPage() {
  const [activeTab, setActiveTab] = useState('create');
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [outline, setOutline] = useState<Chapter[]>([]);
  const [contents, setContents] = useState<ChapterContent[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [latestExport, setLatestExport] = useState<ExportFile | null>(null);
  const [dragChapterId, setDragChapterId] = useState<string | null>(null);
  const [form] = Form.useForm<CreateReportPayload>();

  const selectedChapter = outline.find((item) => item.chapterId === selectedChapterId) || outline[0];
  const selectedContent = selectedChapter
    ? contents.find((item) => item.chapterId === selectedChapter.chapterId)
    : undefined;

  const { generating, percent, progressText, generate } = useReportSSE({
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
    if (!selectedChapterId && outline[0]?.chapterId) {
      setSelectedChapterId(outline[0].chapterId);
    }
  }, [outline, selectedChapterId]);

  const watchedReportType = Form.useWatch('reportType', form) as ReportType | undefined;
  const currentTemplates = useMemo(() => {
    return watchedReportType ? templates.filter((item) => item.reportType === watchedReportType) : templates;
  }, [templates, watchedReportType]);

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
      chapterId: null,
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
    const childIds = outline.filter((item) => item.parentId === chapterId).map((item) => item.chapterId);
    setOutline(renumberOutlineChapters(outline.filter((item) => item.chapterId !== chapterId && !childIds.includes(item.chapterId))));
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
    setExporting(true);
    const values = form.getFieldsValue();
    const task = await createExport(report.reportId, fileFormat, values.templateId);
    const result = await getExportStatus(report.reportId, task.exportId, fileFormat);
    setLatestExport(result);
    setExporting(false);
    message.success(`${fileFormat.toUpperCase()} 导出完成`);
  };

  const handleLoadPreview = async () => {
    if (!report) return;
    const detail = await getReportDetail(report, outline, contents);
    setLatestExport(detail.latestExport);
  };

  return (
    <main className="report-page">
      <section className="report-hero">
        <div>
          <Text type="secondary">报告生成 / 用户端流程</Text>
          <Title level={2}>从创建任务到预览导出</Title>
          <Paragraph>覆盖报告创建、大纲拖动编辑、章节流式生成、进度展示、重新生成、预览与多格式导出。</Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            重置
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setStep(0)}>
            新建报告
          </Button>
        </Space>
      </section>

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
              items={[
                { title: '基础信息' },
                { title: '大纲生成与编辑' },
                { title: '章节内容生成' },
                { title: '预览导出' },
              ]}
            />
          </Card>

          {step === 0 && (
            <Row gutter={16}>
              <Col span={16}>
                <Card title="报告创建页面">
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
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="reportType" label="报告类型" rules={[{ required: true }]}>
                          <Select options={REPORT_TYPE_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="plant" label="电厂" rules={[{ required: true }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="major" label="专业" rules={[{ required: true }]}>
                          <Select options={MAJOR_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="year" label="年份" rules={[{ required: true }]}>
                          <InputNumber min={2020} max={2035} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name="topic" label="报告主题" rules={[{ required: true }]}>
                          <Input.TextArea rows={4} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="templateId" label="报告模板">
                          <Select
                            allowClear
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
                            options={materials.map((item) => ({
                              label: item.materialName,
                              value: item.materialId,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Space>
                      <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleCreate}>
                        创建报告
                      </Button>
                      <Button icon={<FileTextOutlined />} onClick={handleGenerateOutline}>
                        创建并生成大纲
                      </Button>
                    </Space>
                  </Form>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="当前任务">
                  <List
                    dataSource={[
                      ['报告 ID', report?.reportId || '未创建'],
                      ['报告状态', report?.status || '未创建'],
                      ['模板数量', `${templates.length} 个`],
                      ['素材数量', `${materials.length} 个`],
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
                    <Button icon={<ReloadOutlined />} onClick={() => selectedChapter?.chapterId && generate({ chapterIds: [selectedChapter.chapterId], regenerate: true, forceOverwrite: true })}>
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
                    <Button type="primary" block loading={generating} onClick={() => generate()}>
                      生成全部待生成章节
                    </Button>
                    <Button block loading={generating} onClick={() => generate({ regenerate: true, forceOverwrite: true })}>
                      重新生成全文
                    </Button>
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


