import {
    CloudDownloadOutlined,
    DeleteOutlined,
    EyeOutlined,
    FileSyncOutlined,
    PlusOutlined,
    ReloadOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Col,
    Descriptions,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    Typography,
    Upload,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import {
    deleteMaterial,
    deleteTemplate,
    downloadExportFile,
    getModelConfig,
    getReportDetailById,
    listAdminMaterials,
    listAdminTemplates,
    listReportExports,
    listReports,
    reexportReport,
    saveModelConfig,
    testModelConfig,
    updateMaterialStatus,
    updateTemplate,
    updateTemplateStatus,
    uploadMaterial,
    uploadTemplate,
} from '../../services/reportService';
import type { ExportFile, ExportFormat, Material, ModelConfig, Report, ReportDetail, ReportStatus, ReportType, Template } from '../../types/report';
import { formatDateTimeMinute } from '../../utils/datetime';
import './style.css';

const { Title, Text, Paragraph } = Typography;

const REPORT_TYPE_TEXT: Record<ReportType, string> = {
    summerCheck: '迎峰度夏检查报告',
    coalInventoryAudit: '煤库存审计报告',
};

const STATUS_TEXT: Record<ReportStatus, string> = {
    draft: '草稿',
    outlineGenerated: '大纲已生成',
    generating: '生成中',
    generated: '已生成',
    exporting: '导出中',
    exported: '已导出',
    generateFailed: '生成失败',
    exportFailed: '导出失败',
};

const STATUS_COLOR: Record<ReportStatus, string> = {
    draft: 'default',
    outlineGenerated: 'processing',
    generating: 'processing',
    generated: 'success',
    exporting: 'processing',
    exported: 'success',
    generateFailed: 'error',
    exportFailed: 'error',
};

const ADMIN_TAB_PATH_MAP: Record<string, string> = {
    records: '/admin/reports',
    templates: '/admin/templates',
    materials: '/admin/materials',
    model: '/admin/model',
};

const DEFAULT_MODEL_CONFIG: ModelConfig = {
    apiUrl: '',
    modelName: '',
    apiKey: '',
    timeoutSeconds: 120,
    enabled: true,
};

function getActiveTabByPath(pathname: string) {
    if (pathname.endsWith('/templates')) return 'templates';
    if (pathname.endsWith('/materials')) return 'materials';
    if (pathname.endsWith('/model')) return 'model';
    return 'records';
}

function formatFileSize(size?: number) {
    if (!size) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

const formatDateTime = formatDateTimeMinute;

function structureToText(structure?: Record<string, unknown>) {
    const outline = flattenTemplateStructure(structure);
    if (outline.length) return outline.join('\n');
    const chapters = structure?.chapters;
    if (Array.isArray(chapters)) return chapters.join('\n');
    if (!structure || Object.keys(structure).length === 0) return '';
    return JSON.stringify(structure, null, 2);
}

function flattenTemplateStructure(structure?: Record<string, unknown>) {
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
    return rows;
}

function textToStructure(text: string) {
    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
        // Plain text is treated as one chapter per line.
    }
    return {
        chapters: text
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
    };
}

/** 报告记录与管理后台页面。 */
function acceptTemplateFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.docx')) {
        message.error('报告模板仅支持 DOCX 文件');
        return Upload.LIST_IGNORE;
    }
    return true;
}

function acceptMaterialFile(file: File) {
    const supported = ['.doc', '.docx', '.txt', '.md', '.csv', '.pdf', '.xlsx'];
    if (!supported.some((suffix) => file.name.toLowerCase().endsWith(suffix))) {
        message.error('素材支持 DOC/DOCX/TXT/MD/CSV/PDF/XLSX 文件');
        return Upload.LIST_IGNORE;
    }
    if (file.size <= 0) {
        message.error('不能上传空文件');
        return Upload.LIST_IGNORE;
    }
    if (file.size > 50 * 1024 * 1024) {
        message.error('单个素材文件不能超过 50MB');
        return Upload.LIST_IGNORE;
    }
    return true;
}

export default function ReportManagementPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[]>([]);
    const [latestExports, setLatestExports] = useState<Record<string, ExportFile | null>>({});
    const [templates, setTemplates] = useState<Template[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedDetail, setSelectedDetail] = useState<ReportDetail | null>(null);
    const [templateDetail, setTemplateDetail] = useState<Template | null>(null);
    const [materialDetail, setMaterialDetail] = useState<Material | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [structureModalOpen, setStructureModalOpen] = useState(false);
    const [materialModalOpen, setMaterialModalOpen] = useState(false);
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [actioning, setActioning] = useState('');
    const [templateForm] = Form.useForm<{ templateName: string; reportType: ReportType }>();
    const [structureForm] = Form.useForm<{ structureText: string }>();
    const [materialForm] = Form.useForm<{ materialName: string; materialType: string; major?: string; description?: string }>();
    const [modelForm] = Form.useForm<ModelConfig>();

    const activeTab = getActiveTabByPath(location.pathname);
    const exportedCount = useMemo(
        () => reports.filter((item) => item.status === 'exported' || latestExports[item.reportId]).length,
        [latestExports, reports],
    );

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await listReports({ page: 1, size: 50 });
            setReports(data.items);
            const exportPairs = await Promise.all(
                data.items.map(async (report) => {
                    const exports = await listReportExports(report.reportId, { page: 1, size: 1 }).catch(() => ({ items: [] }));
                    return [report.reportId, exports.items[0] || null] as const;
                }),
            );
            setLatestExports(Object.fromEntries(exportPairs));
        } catch (error) {
            message.error(error instanceof Error ? error.message : '报告记录加载失败');
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async () => {
        setLoading(true);
        try {
            setTemplates((await listAdminTemplates({ page: 1, size: 50 })).items);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '模板加载失败');
        } finally {
            setLoading(false);
        }
    };

    const loadMaterials = async () => {
        setLoading(true);
        try {
            setMaterials((await listAdminMaterials({ page: 1, size: 50 })).items);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '素材加载失败');
        } finally {
            setLoading(false);
        }
    };

    const loadModelConfig = async () => {
        setLoading(true);
        try {
            modelForm.setFieldsValue({ ...DEFAULT_MODEL_CONFIG, ...(await getModelConfig()), apiKey: '' });
        } catch (error) {
            message.error(error instanceof Error ? error.message : '模型配置加载失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
        loadTemplates();
        loadMaterials();
        loadModelConfig();
    }, []);

    const handleViewReport = async (record: Report) => {
        setActioning(record.reportId);
        try {
            setSelectedDetail(await getReportDetailById(record.reportId));
        } catch (error) {
            message.error(error instanceof Error ? error.message : '报告详情加载失败');
        } finally {
            setActioning('');
        }
    };

    const handleReexport = async (record: Report, format: ExportFormat) => {
        setActioning(record.reportId);
        try {
            const file = await reexportReport(record.reportId, format);
            setLatestExports((prev) => ({ ...prev, [record.reportId]: file }));
            setReports((prev) => prev.map((item) => (item.reportId === record.reportId ? { ...item, status: 'exported' } : item)));
            message.success(`已重新导出 ${format.toUpperCase()}`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '重新导出失败');
        } finally {
            setActioning('');
        }
    };

    const handleDownload = async (record: Report) => {
        const file = latestExports[record.reportId];
        if (!file) {
            message.warning('该报告暂无导出文件，请先重新导出');
            return;
        }
        try {
            await downloadExportFile(file);
            message.success(`已开始下载：${file.fileName}`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '下载失败');
        }
    };

    const handleUploadTemplate = async () => {
        const values = await templateForm.validateFields();
        if (!templateFile) {
            message.warning('请选择模板文件');
            return;
        }
        setActioning('template-upload');
        try {
            await uploadTemplate({ ...values, file: templateFile });
            setTemplateModalOpen(false);
            setTemplateFile(null);
            templateForm.resetFields();
            await loadTemplates();
            message.success('模板已上传');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '模板上传失败');
        } finally {
            setActioning('');
        }
    };

    const handleOpenStructure = (record: Template) => {
        setEditingTemplate(record);
        structureForm.setFieldsValue({ structureText: structureToText(record.structure) });
        setStructureModalOpen(true);
    };

    const handleSaveStructure = async () => {
        if (!editingTemplate) return;
        const values = await structureForm.validateFields();
        setActioning(editingTemplate.templateId);
        try {
            await updateTemplate(editingTemplate.templateId, {
                templateName: editingTemplate.templateName,
                status: editingTemplate.status,
                structure: textToStructure(values.structureText),
            });
            setStructureModalOpen(false);
            setEditingTemplate(null);
            await loadTemplates();
            message.success('模板结构已保存');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '模板结构保存失败');
        } finally {
            setActioning('');
        }
    };

    const handleToggleTemplate = async (record: Template) => {
        setActioning(record.templateId);
        try {
            await updateTemplateStatus(record.templateId, record.status === 'enabled' ? 'disabled' : 'enabled');
            await loadTemplates();
            message.success('模板状态已更新');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '模板状态更新失败');
        } finally {
            setActioning('');
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        setActioning(templateId);
        try {
            await deleteTemplate(templateId);
            await loadTemplates();
            message.success('模板已删除');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '模板删除失败');
        } finally {
            setActioning('');
        }
    };

    const handleUploadMaterial = async () => {
        const values = await materialForm.validateFields();
        if (!materialFile) {
            message.warning('请选择素材文件');
            return;
        }
        setActioning('material-upload');
        try {
            await uploadMaterial({ ...values, file: materialFile });
            setMaterialModalOpen(false);
            setMaterialFile(null);
            materialForm.resetFields();
            await loadMaterials();
            message.success('素材已上传');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '素材上传失败');
        } finally {
            setActioning('');
        }
    };

    const handleToggleMaterial = async (record: Material) => {
        setActioning(record.materialId);
        try {
            await updateMaterialStatus(record.materialId, record.status === 'enabled' ? 'disabled' : 'enabled');
            await loadMaterials();
            message.success('素材状态已更新');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '素材状态更新失败');
        } finally {
            setActioning('');
        }
    };

    const handleDeleteMaterial = async (materialId: string) => {
        setActioning(materialId);
        try {
            await deleteMaterial(materialId);
            await loadMaterials();
            message.success('素材已删除');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '素材删除失败');
        } finally {
            setActioning('');
        }
    };

    const handleSaveModelConfig = async () => {
        const values = await modelForm.validateFields();
        setActioning('model-save');
        try {
            await saveModelConfig(values);
            await loadModelConfig();
            message.success('模型配置已保存');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '模型配置保存失败');
        } finally {
            setActioning('');
        }
    };

    const handleTestModel = async () => {
        setActioning('model-test');
        try {
            const result = await testModelConfig();
            message.success(`模型连接可用，延迟 ${result.latencyMs}ms`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '模型连接测试失败');
        } finally {
            setActioning('');
        }
    };

    const reportColumns: ColumnsType<Report> = [
        {
            title: '报告名称',
            dataIndex: 'reportName',
            render: (text, record) => (
                <Button type="link" onClick={() => handleViewReport(record)}>
                    {text}
                </Button>
            ),
        },
        { title: '报告类型', dataIndex: 'reportType', width: 170, render: (value: ReportType) => REPORT_TYPE_TEXT[value] || value },
        { title: '电厂', dataIndex: 'plant', width: 120, render: (value?: string) => value || '-' },
        { title: '年份', dataIndex: 'year', width: 90, render: (value?: number) => value || '-' },
        { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: (value?: string) => formatDateTime(value) },
        {
            title: '状态',
            dataIndex: 'status',
            width: 130,
            render: (value: ReportStatus) => <Tag color={STATUS_COLOR[value]}>{STATUS_TEXT[value]}</Tag>,
        },
        { title: '最新文件', width: 220, render: (_, record) => latestExports[record.reportId]?.fileName || '-' },
        {
            title: '操作',
            width: 330,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} loading={actioning === record.reportId} onClick={() => handleViewReport(record)}>
                        详情
                    </Button>
                    <Button size="small" icon={<CloudDownloadOutlined />} onClick={() => handleDownload(record)}>
                        下载
                    </Button>
                    <Select<ExportFormat>
                        size="small"
                        placeholder="重新导出"
                        style={{ width: 110 }}
                        onChange={(format) => handleReexport(record, format)}
                        options={[
                            { label: 'DOCX', value: 'docx' },
                            { label: 'MD', value: 'md' },
                            { label: 'TXT', value: 'txt' },
                        ]}
                    />
                </Space>
            ),
        },
    ];

    const templateColumns: ColumnsType<Template> = [
        { title: '模板名称', dataIndex: 'templateName' },
        { title: '报告类型', dataIndex: 'reportType', render: (value: ReportType) => REPORT_TYPE_TEXT[value] || value },
        { title: '文件名', dataIndex: 'fileName' },
        { title: '创建人', dataIndex: 'createdBy', width: 120 },
        {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (value) => <Tag color={value === 'enabled' ? 'success' : 'default'}>{value === 'enabled' ? '启用' : '停用'}</Tag>,
        },
        {
            title: '操作',
            width: 280,
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => setTemplateDetail(record)}>
                        详情
                    </Button>
                    <Button size="small" onClick={() => handleOpenStructure(record)}>
                        编辑结构
                    </Button>
                    <Button size="small" loading={actioning === record.templateId} onClick={() => handleToggleTemplate(record)}>
                        {record.status === 'enabled' ? '停用' : '启用'}
                    </Button>
                    <Popconfirm title="确认删除该模板？" onConfirm={() => handleDeleteTemplate(record.templateId)}>
                        <Button size="small" danger loading={actioning === record.templateId}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const materialColumns: ColumnsType<Material> = [
        { title: '素材名称', dataIndex: 'materialName' },
        { title: '专业', dataIndex: 'major', width: 110, render: (value?: string) => value || '-' },
        { title: '类型', dataIndex: 'materialType', width: 110, render: (value?: string) => value || '-' },
        { title: '文件名', dataIndex: 'fileName' },
        { title: '大小', dataIndex: 'fileSize', width: 110, render: (value?: number) => formatFileSize(value) },
        { title: '创建人', dataIndex: 'createdBy', width: 120 },
        {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (value) => <Tag color={value === 'enabled' ? 'success' : 'default'}>{value === 'enabled' ? '启用' : '停用'}</Tag>,
        },
        {
            title: '操作',
            width: 260,
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => setMaterialDetail(record)}>
                        查看解析
                    </Button>
                    <Button size="small" loading={actioning === record.materialId} onClick={() => handleToggleMaterial(record)}>
                        {record.status === 'enabled' ? '停用' : '启用'}
                    </Button>
                    <Popconfirm title="确认删除该素材？" onConfirm={() => handleDeleteMaterial(record.materialId)}>
                        <Button size="small" danger loading={actioning === record.materialId}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <main className="management-page">
            <section className="management-hero">
                <div>
                    <Text type="secondary">报告记录与管理后台</Text>
                    <Title level={2}>记录、模板、素材与模型配置</Title>
                    <Paragraph>报告记录、模板、素材和模型配置均已接入后端真实接口。</Paragraph>
                </div>
                <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { loadReports(); loadTemplates(); loadMaterials(); loadModelConfig(); }}>
                    刷新数据
                </Button>
            </section>

            <Row gutter={16} className="management-stats">
                <Col span={6}><Card><Text type="secondary">报告总数</Text><strong>{reports.length}</strong></Card></Col>
                <Col span={6}><Card><Text type="secondary">已导出</Text><strong>{exportedCount}</strong></Card></Col>
                <Col span={6}><Card><Text type="secondary">模板数量</Text><strong>{templates.length}</strong></Card></Col>
                <Col span={6}><Card><Text type="secondary">素材数量</Text><strong>{materials.length}</strong></Card></Col>
            </Row>

            <Tabs
                activeKey={activeTab}
                onChange={(key) => navigate(ADMIN_TAB_PATH_MAP[key])}
                items={[
                    {
                        key: 'records',
                        label: '报告记录',
                        children: (
                            <Card title="报告记录列表">
                                <Table rowKey="reportId" columns={reportColumns} dataSource={reports} loading={loading} pagination={{ pageSize: 8 }} locale={{ emptyText: <Empty description="暂无报告记录" /> }} />
                            </Card>
                        ),
                    },
                    {
                        key: 'templates',
                        label: '模板管理',
                        children: (
                            <Card title="模板管理" extra={<Button type="primary" icon={<UploadOutlined />} onClick={() => setTemplateModalOpen(true)}>上传模板</Button>}>
                                <Table rowKey="templateId" columns={templateColumns} dataSource={templates} loading={loading} pagination={false} />
                            </Card>
                        ),
                    },
                    {
                        key: 'materials',
                        label: '素材管理',
                        children: (
                            <Card title="素材管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setMaterialModalOpen(true)}>上传素材</Button>}>
                                <Table rowKey="materialId" columns={materialColumns} dataSource={materials} loading={loading} pagination={false} />
                            </Card>
                        ),
                    },
                    {
                        key: 'model',
                        label: '模型配置',
                        children: (
                            <Card title="模型配置页面" loading={loading}>
                                <Form form={modelForm} layout="vertical" initialValues={DEFAULT_MODEL_CONFIG} className="model-form">
                                    <Row gutter={16}>
                                        <Col span={12}><Form.Item name="apiUrl" label="API 地址" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                        <Col span={12}><Form.Item name="apiKey" label="API 密钥"><Input.Password placeholder="留空则保持原密钥" /></Form.Item></Col>
                                        <Col span={12}><Form.Item name="modelName" label="模型名称" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                        <Col span={8}><Form.Item name="timeoutSeconds" label="超时时间（秒）" rules={[{ required: true }]}><InputNumber min={10} max={600} style={{ width: '100%' }} /></Form.Item></Col>
                                        <Col span={8}><Form.Item name="enabled" label="启用状态" valuePropName="checked"><Switch checkedChildren="启用" unCheckedChildren="停用" /></Form.Item></Col>
                                    </Row>
                                    <Space>
                                        <Button type="primary" icon={<FileSyncOutlined />} loading={actioning === 'model-save'} onClick={handleSaveModelConfig}>保存模型配置</Button>
                                        <Button loading={actioning === 'model-test'} onClick={handleTestModel}>测试模型连接</Button>
                                    </Space>
                                </Form>
                            </Card>
                        ),
                    },
                ]}
            />

            <Drawer width={680} title="报告详情" open={Boolean(selectedDetail)} onClose={() => setSelectedDetail(null)}>
                {selectedDetail && (
                    <Tabs
                        items={[
                            {
                                key: 'base',
                                label: '基本信息',
                                children: (
                                    <Descriptions bordered column={1}>
                                        <Descriptions.Item label="报告编号">{selectedDetail.report.reportId}</Descriptions.Item>
                                        <Descriptions.Item label="报告名称">{selectedDetail.report.reportName}</Descriptions.Item>
                                        <Descriptions.Item label="报告类型">{REPORT_TYPE_TEXT[selectedDetail.report.reportType]}</Descriptions.Item>
                                        <Descriptions.Item label="状态">{STATUS_TEXT[selectedDetail.report.status]}</Descriptions.Item>
                                        <Descriptions.Item label="更新时间">{formatDateTime(selectedDetail.report.updatedAt)}</Descriptions.Item>
                                        <Descriptions.Item label="最新文件">{selectedDetail.latestExport?.fileName || '-'}</Descriptions.Item>
                                    </Descriptions>
                                ),
                            },
                            {
                                key: 'outline',
                                label: '大纲',
                                children: selectedDetail.outline.map((item) => <p key={item.chapterId}>{item.chapterNo} {item.title}</p>),
                            },
                        ]}
                    />
                )}
            </Drawer>

            <Drawer width={560} title="模板详情" open={Boolean(templateDetail)} onClose={() => setTemplateDetail(null)}>
                {templateDetail && (
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="模板名称">{templateDetail.templateName}</Descriptions.Item>
                        <Descriptions.Item label="绑定报告类型">{REPORT_TYPE_TEXT[templateDetail.reportType]}</Descriptions.Item>
                        <Descriptions.Item label="文件名">{templateDetail.fileName}</Descriptions.Item>
                        <Descriptions.Item label="创建人">{templateDetail.createdBy || '-'}</Descriptions.Item>
                        <Descriptions.Item label="启用状态">{templateDetail.status === 'enabled' ? '启用' : '停用'}</Descriptions.Item>
                        <Descriptions.Item label="模板结构"><pre>{structureToText(templateDetail.structure) || '-'}</pre></Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>

            <Modal title="上传报告模板" open={templateModalOpen} onOk={handleUploadTemplate} confirmLoading={actioning === 'template-upload'} onCancel={() => setTemplateModalOpen(false)}>
                <Form form={templateForm} layout="vertical">
                    <Paragraph type="secondary">模板仅支持 DOCX，建议使用含标题样式的 Word 文件，最大 50MB。</Paragraph>
                    <Form.Item name="templateName" label="模板名称" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="reportType" label="报告类型" rules={[{ required: true }]}>
                        <Select options={[
                            { label: '迎峰度夏检查报告', value: 'summerCheck' },
                            { label: '煤库存审计报告', value: 'coalInventoryAudit' },
                        ]} />
                    </Form.Item>
                    <Upload beforeUpload={(file) => { if (acceptTemplateFile(file as File) !== true) return Upload.LIST_IGNORE; setTemplateFile(file as File); return false; }} maxCount={1}>
                        <Button icon={<UploadOutlined />}>选择模板文件</Button>
                    </Upload>
                </Form>
            </Modal>

            <Modal title="编辑模板结构" open={structureModalOpen} onOk={handleSaveStructure} confirmLoading={Boolean(editingTemplate && actioning === editingTemplate.templateId)} onCancel={() => setStructureModalOpen(false)}>
                <Form form={structureForm} layout="vertical">
                    <Form.Item name="structureText" label="章节结构（一行一个章节，或直接填写 JSON）" rules={[{ required: true }]}>
                        <Input.TextArea rows={8} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title="上传素材" open={materialModalOpen} onOk={handleUploadMaterial} confirmLoading={actioning === 'material-upload'} onCancel={() => setMaterialModalOpen(false)}>
                <Form form={materialForm} layout="vertical" initialValues={{ materialType: 'standard' }}>
                    <Paragraph type="secondary">可上传 DOC/DOCX/TXT/MD/CSV/PDF/XLSX，最大 50MB；当前 DOCX/TXT/MD/CSV 可参与 AI 正文解析，PDF/XLSX 仅保存文件信息。</Paragraph>
                    <Form.Item name="materialName" label="素材名称" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="materialType" label="素材类型" rules={[{ required: true }]}><Input placeholder="例如 standard / report / reference" /></Form.Item>
                    <Form.Item name="major" label="专业">
                        <Select allowClear options={['电气', '锅炉', '汽机', '燃料', '安全监督'].map((item) => ({ label: item, value: item }))} />
                    </Form.Item>
                    <Form.Item name="description" label="说明"><Input.TextArea rows={3} /></Form.Item>
                    <Upload beforeUpload={(file) => { if (acceptMaterialFile(file as File) !== true) return Upload.LIST_IGNORE; setMaterialFile(file as File); return false; }} maxCount={1}>
                        <Button icon={<UploadOutlined />}>选择素材文件</Button>
                    </Upload>
                </Form>
            </Modal>
            <Drawer width={560} title="素材解析结果" open={Boolean(materialDetail)} onClose={() => setMaterialDetail(null)}>
                {materialDetail && (
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="素材名称">{materialDetail.materialName}</Descriptions.Item>
                        <Descriptions.Item label="专业">{materialDetail.major || '通用'}</Descriptions.Item>
                        <Descriptions.Item label="文件名">{materialDetail.fileName}</Descriptions.Item>
                        <Descriptions.Item label="文件类型">{materialDetail.fileType || '-'}</Descriptions.Item>
                        <Descriptions.Item label="解析状态">
                            <Tag color={materialDetail.parseSupported ? 'success' : 'warning'}>
                                {materialDetail.parseSupported ? '可参与正文解析' : '已上传但暂不解析'}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="说明">
                            {materialDetail.parseMessage || 'DOCX/TXT/MD/CSV 可参与正文解析；PDF/XLSX 当前仅保存文件信息。'}
                        </Descriptions.Item>
                        <Descriptions.Item label="描述">{materialDetail.description || '-'}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </main>
    );
}
