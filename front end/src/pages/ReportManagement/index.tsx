import {
    CloudDownloadOutlined,
    EyeOutlined,
    FileSyncOutlined,
    PlusOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Col,
    Descriptions,
    Drawer,
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
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { downloadExportFile } from '../../services/reportService';
import type { ExportFormat, ReportStatus, ReportType } from '../../types/report';
import './style.css';

const { Title, Text, Paragraph } = Typography;

type AdminRole = 'user' | 'admin';

interface ManagedReport {
    reportId: string;
    reportName: string;
    reportType: ReportType;
    plant: string;
    major: string;
    year: number;
    status: ReportStatus;
    createdBy: string;
    updatedAt: string;
    latestFileName: string;
}

interface ManagedTemplate {
    templateId: string;
    templateName: string;
    reportType: ReportType;
    fileName: string;
    uploadedBy: string;
    structure: string[];
    status: 'enabled' | 'disabled';
}

interface ManagedMaterial {
    materialId: string;
    materialName: string;
    major: string;
    fileName: string;
    fileSize: string;
    uploadedBy: string;
    uploadedAt: string;
    fileType: string;
    status: 'enabled' | 'disabled';
}

interface ModelConfig {
    apiUrl: string;
    apiKey: string;
    provider: string;
    modelName: string;
    timeoutSeconds: number;
    temperature: number;
    maxTokens: number;
    streamEnabled: boolean;
}

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

const INITIAL_REPORTS: ManagedReport[] = [
    {
        reportId: 'RPT-202606-001',
        reportName: 'XX电厂2026年迎峰度夏检查报告',
        reportType: 'summerCheck',
        plant: 'XX电厂',
        major: '电气',
        year: 2026,
        status: 'exported',
        createdBy: '张三',
        updatedAt: '2026-06-26 16:30',
        latestFileName: 'XX电厂2026年迎峰度夏检查报告.docx',
    },
    {
        reportId: 'RPT-202606-002',
        reportName: 'A电厂煤库存专项审计报告',
        reportType: 'coalInventoryAudit',
        plant: 'A电厂',
        major: '燃料',
        year: 2026,
        status: 'generated',
        createdBy: '李四',
        updatedAt: '2026-06-27 10:12',
        latestFileName: 'A电厂煤库存专项审计报告.pdf',
    },
    {
        reportId: 'RPT-202606-003',
        reportName: 'B电厂迎峰度夏安全监督报告',
        reportType: 'summerCheck',
        plant: 'B电厂',
        major: '安全监督',
        year: 2026,
        status: 'generateFailed',
        createdBy: '王五',
        updatedAt: '2026-06-27 18:05',
        latestFileName: '-',
    },
];

const INITIAL_TEMPLATES: ManagedTemplate[] = [
    {
        templateId: 'TPL-001',
        templateName: '迎峰度夏检查报告模板',
        reportType: 'summerCheck',
        fileName: 'summer-check-template.docx',
        uploadedBy: '管理员',
        structure: ['检查概况', '重点检查内容', '问题分析与整改建议', '结论'],
        status: 'enabled',
    },
    {
        templateId: 'TPL-002',
        templateName: '煤库存审计报告模板',
        reportType: 'coalInventoryAudit',
        fileName: 'coal-audit-template.docx',
        uploadedBy: '管理员',
        structure: ['审计概况', '库存核查', '差异分析', '审计结论'],
        status: 'enabled',
    },
];

const INITIAL_MATERIALS: ManagedMaterial[] = [
    {
        materialId: 'MAT-001',
        materialName: '迎峰度夏检查标准',
        major: '电气',
        fileName: 'summer-standard.pdf',
        fileSize: '1.2 MB',
        uploadedBy: '管理员',
        uploadedAt: '2026-06-26 10:30',
        fileType: 'pdf',
        status: 'enabled',
    },
    {
        materialId: 'MAT-002',
        materialName: '设备运行月报',
        major: '汽机',
        fileName: 'run-monthly.docx',
        fileSize: '824 KB',
        uploadedBy: '管理员',
        uploadedAt: '2026-06-27 14:10',
        fileType: 'docx',
        status: 'enabled',
    },
];

const ADMIN_TAB_PATH_MAP: Record<string, string> = {
    records: '/admin/reports',
    templates: '/admin/templates',
    materials: '/admin/materials',
    model: '/admin/model',
};

function getActiveTabByPath(pathname: string) {
    if (pathname.endsWith('/templates')) return 'templates';
    if (pathname.endsWith('/materials')) return 'materials';
    if (pathname.endsWith('/model')) return 'model';
    return 'records';
}


function getFormatFromFileName(fileName: string): ExportFormat {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext === 'pdf' || ext === 'md' || ext === 'txt' ? ext : 'docx';
}

async function downloadManagedReport(record: ManagedReport) {
    const fileName = record.latestFileName && record.latestFileName !== '-' ? record.latestFileName : `${record.reportName}.docx`;
    await downloadExportFile({
        exportId: `mock-${record.reportId}`,
        reportId: record.reportId,
        fileName,
        fileFormat: getFormatFromFileName(fileName),
        fileSize: 0,
        downloadUrl: `/api/reports/${record.reportId}/exports/latest/download`,
        status: 'exported',
        createdAt: record.updatedAt,
    });
}
/** 报告记录与管理后台页面。 */
export default function ReportManagementPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [reports, setReports] = useState(INITIAL_REPORTS);
    const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
    const [materials, setMaterials] = useState(INITIAL_MATERIALS);
    const [role, setRole] = useState<AdminRole>('admin');
    const [selectedReport, setSelectedReport] = useState<ManagedReport | null>(null);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateDetail, setTemplateDetail] = useState<ManagedTemplate | null>(null);
    const [structureModalOpen, setStructureModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ManagedTemplate | null>(null);
    const [materialModalOpen, setMaterialModalOpen] = useState(false);
    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        apiUrl: 'http://127.0.0.1:9000/v1/chat/completions',
        apiKey: 'sk-test-key',
        provider: 'OpenAI Compatible',
        modelName: 'report-generator-v1',
        timeoutSeconds: 60,
        temperature: 0.3,
        maxTokens: 4096,
        streamEnabled: true,
    });
    const [templateForm] = Form.useForm<ManagedTemplate>();
    const [structureForm] = Form.useForm<{ structureText: string }>();
    const [materialForm] = Form.useForm<ManagedMaterial>();
    const [modelForm] = Form.useForm<ModelConfig>();

    const exportedCount = useMemo(() => reports.filter((item) => item.status === 'exported').length, [reports]);

    /** 模拟重新导出报告。 */
    const handleReexport = (record: ManagedReport, format: ExportFormat) => {
        setReports((prev) =>
            prev.map((item) =>
                item.reportId === record.reportId
                    ? {
                          ...item,
                          status: 'exported',
                          latestFileName: `${item.reportName}.${format}`,
                          updatedAt: '刚刚',
                      }
                    : item,
            ),
        );
        message.success(`${record.reportName} 已重新导出为 ${format.toUpperCase()}`);
    };

    /** 新增模板，只有管理员可以执行。 */
    const handleCreateTemplate = async () => {
        if (role !== 'admin') {
            message.warning('只有管理员可以上传模板');
            return;
        }
        const values = await templateForm.validateFields();
        setTemplates([
            ...templates,
            {
                ...values,
                templateId: `TPL-${Date.now()}`,
                uploadedBy: '当前管理员',
                structure: ['检查概况', '重点检查内容', '问题分析与整改建议', '结论'],
                status: 'enabled',
            },
        ]);
        setTemplateModalOpen(false);
        templateForm.resetFields();
        message.success('模板已上传');
    };

    /** 新增素材文件记录。 */
    const handleCreateMaterial = async () => {
        const values = await materialForm.validateFields();
        setMaterials([
            ...materials,
            {
                ...values,
                materialId: `MAT-${Date.now()}`,
                fileSize: values.fileSize || '待后端返回',
                uploadedBy: '当前管理员',
                uploadedAt: '刚刚',
                fileType: values.fileName.split('.').pop() || 'unknown',
                status: 'enabled',
            },
        ]);
        setMaterialModalOpen(false);
        materialForm.resetFields();
        message.success('素材已添加');
    };

    /** 保存模型配置。 */
    const handleSaveModelConfig = async () => {
        const values = await modelForm.validateFields();
        setModelConfig(values);
        message.success('模型配置已保存');
    };

    const handleOpenStructure = (record: ManagedTemplate) => {
        setEditingTemplate(record);
        structureForm.setFieldsValue({ structureText: record.structure.join('\n') });
        setStructureModalOpen(true);
    };

    const handleSaveStructure = async () => {
        const values = await structureForm.validateFields();
        const nextStructure = values.structureText
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
        setTemplates((prev) =>
            prev.map((item) => (item.templateId === editingTemplate?.templateId ? { ...item, structure: nextStructure } : item)),
        );
        setStructureModalOpen(false);
        setEditingTemplate(null);
        message.success('模板结构已保存');
    };

    const handleTestModel = async () => {
        const values = await modelForm.validateFields();
        setModelConfig(values);
        message.success('模型连接测试成功（mock）');
    };

    const reportColumns: ColumnsType<ManagedReport> = [
        {
            title: '报告名称',
            dataIndex: 'reportName',
            render: (text, record) => (
                <Button type="link" onClick={() => setSelectedReport(record)}>
                    {text}
                </Button>
            ),
        },
        {
            title: '报告类型',
            dataIndex: 'reportType',
            width: 170,
            render: (value: ReportType) => REPORT_TYPE_TEXT[value],
        },
        { title: '电厂', dataIndex: 'plant', width: 120 },
        { title: '专业', dataIndex: 'major', width: 120 },
        {
            title: '状态',
            dataIndex: 'status',
            width: 130,
            render: (value: ReportStatus) => <Tag color={STATUS_COLOR[value]}>{STATUS_TEXT[value]}</Tag>,
        },
        { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
        {
            title: '操作',
            width: 260,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedReport(record)}>
                        详情
                    </Button>
                    <Button size="small" icon={<CloudDownloadOutlined />} onClick={async () => { await downloadManagedReport(record); message.success(`已开始下载：${record.latestFileName}`); }}>
                        下载
                    </Button>
                    <Select<ExportFormat>
                        size="small"
                        defaultValue="pdf"
                        style={{ width: 92 }}
                        onChange={(format) => handleReexport(record, format)}
                        options={[
                            { label: 'PDF', value: 'pdf' },
                            { label: 'DOCX', value: 'docx' },
                            { label: 'MD', value: 'md' },
                            { label: 'TXT', value: 'txt' },
                        ]}
                    />
                </Space>
            ),
        },
    ];

    const templateColumns: ColumnsType<ManagedTemplate> = [
        { title: '模板名称', dataIndex: 'templateName' },
        {
            title: '报告类型',
            dataIndex: 'reportType',
            render: (value: ReportType) => REPORT_TYPE_TEXT[value],
        },
        { title: '文件名', dataIndex: 'fileName' },
        { title: '上传人', dataIndex: 'uploadedBy', width: 120 },
        {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (value) => <Tag color={value === 'enabled' ? 'success' : 'default'}>{value === 'enabled' ? '启用' : '停用'}</Tag>,
        },
        {
            title: '操作',
            width: 250,
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => setTemplateDetail(record)}>
                        详情
                    </Button>
                    <Button size="small" onClick={() => handleOpenStructure(record)}>
                        编辑结构
                    </Button>
                    <Button
                        size="small"
                        onClick={() =>
                            setTemplates((prev) =>
                                prev.map((item) =>
                                    item.templateId === record.templateId
                                        ? { ...item, status: item.status === 'enabled' ? 'disabled' : 'enabled' }
                                        : item,
                                ),
                            )
                        }
                    >
                        {record.status === 'enabled' ? '停用' : '启用'}
                    </Button>
                    <Popconfirm title="确认删除该模板？" onConfirm={() => setTemplates(templates.filter((item) => item.templateId !== record.templateId))}>
                        <Button size="small" danger>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const materialColumns: ColumnsType<ManagedMaterial> = [
        { title: '素材名称', dataIndex: 'materialName' },
        { title: '专业', dataIndex: 'major', width: 120 },
        { title: '文件名', dataIndex: 'fileName' },
        { title: '上传人', dataIndex: 'uploadedBy', width: 110 },
        { title: '上传时间', dataIndex: 'uploadedAt', width: 150 },
        { title: '文件类型', dataIndex: 'fileType', width: 100 },
        { title: '大小', dataIndex: 'fileSize', width: 120 },
        {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (value) => <Tag color={value === 'enabled' ? 'success' : 'default'}>{value === 'enabled' ? '启用' : '停用'}</Tag>,
        },
        {
            title: '操作',
            width: 170,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        onClick={() =>
                            setMaterials((prev) =>
                                prev.map((item) =>
                                    item.materialId === record.materialId
                                        ? { ...item, status: item.status === 'enabled' ? 'disabled' : 'enabled' }
                                        : item,
                                ),
                            )
                        }
                    >
                        {record.status === 'enabled' ? '停用' : '启用'}
                    </Button>
                    <Popconfirm title="确认删除该素材？" onConfirm={() => setMaterials(materials.filter((item) => item.materialId !== record.materialId))}>
                        <Button size="small" danger>
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
                    <Paragraph>覆盖报告记录查询、详情查看、下载、重新导出，以及管理员侧模板上传和配置维护。</Paragraph>
                </div>
                <Space>
                    <Text>当前角色</Text>
                    <Select<AdminRole>
                        value={role}
                        style={{ width: 120 }}
                        onChange={setRole}
                        options={[
                            { label: '管理员', value: 'admin' },
                            { label: '普通用户', value: 'user' },
                        ]}
                    />
                </Space>
            </section>

            <Row gutter={16} className="management-stats">
                <Col span={6}>
                    <Card>
                        <Text type="secondary">报告总数</Text>
                        <strong>{reports.length}</strong>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Text type="secondary">已导出</Text>
                        <strong>{exportedCount}</strong>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Text type="secondary">模板数量</Text>
                        <strong>{templates.length}</strong>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Text type="secondary">素材数量</Text>
                        <strong>{materials.length}</strong>
                    </Card>
                </Col>
            </Row>

            <Tabs
                activeKey={getActiveTabByPath(location.pathname)}
                onChange={(key) => navigate(ADMIN_TAB_PATH_MAP[key])}
                items={[
                    {
                        key: 'records',
                        label: '报告记录',
                        children: (
                            <Card title="报告记录列表">
                                <Table rowKey="reportId" columns={reportColumns} dataSource={reports} pagination={{ pageSize: 6 }} />
                            </Card>
                        ),
                    },
                    {
                        key: 'templates',
                        label: '模板管理',
                        children: (
                            <Card
                                title="模板管理"
                                extra={
                                    <Button
                                        type="primary"
                                        icon={<UploadOutlined />}
                                        disabled={role !== 'admin'}
                                        onClick={() => setTemplateModalOpen(true)}
                                    >
                                        上传模板
                                    </Button>
                                }
                            >
                                {role !== 'admin' && <Paragraph type="secondary">当前为普通用户，只能查看模板，不能上传或维护模板。</Paragraph>}
                                <Table rowKey="templateId" columns={templateColumns} dataSource={templates} pagination={false} />
                            </Card>
                        ),
                    },
                    {
                        key: 'materials',
                        label: '素材管理',
                        children: (
                            <Card
                                title="素材管理"
                                extra={
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setMaterialModalOpen(true)}>
                                        新增素材
                                    </Button>
                                }
                            >
                                <Table rowKey="materialId" columns={materialColumns} dataSource={materials} pagination={false} />
                            </Card>
                        ),
                    },
                    {
                        key: 'model',
                        label: '模型配置',
                        children: (
                            <Card title="模型配置页面">
                                <Form form={modelForm} layout="vertical" initialValues={modelConfig} className="model-form">
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="apiUrl" label="API 地址" rules={[{ required: true }]}>
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="apiKey" label="API 密钥" rules={[{ required: true }]}>
                                                <Input.Password />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="provider" label="模型服务商" rules={[{ required: true }]}>
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="modelName" label="模型名称" rules={[{ required: true }]}>
                                                <Input />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="timeoutSeconds" label="超时时间（秒）" rules={[{ required: true }]}>
                                                <InputNumber min={10} max={600} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="temperature" label="温度参数" rules={[{ required: true }]}>
                                                <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="maxTokens" label="最大输出 Token" rules={[{ required: true }]}>
                                                <InputNumber min={1024} max={32000} step={512} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item name="streamEnabled" label="流式输出" valuePropName="checked">
                                                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Space>
                                        <Button type="primary" icon={<FileSyncOutlined />} onClick={handleSaveModelConfig}>
                                            保存模型配置
                                        </Button>
                                        <Button onClick={handleTestModel}>测试模型连接</Button>
                                    </Space>
                                </Form>
                            </Card>
                        ),
                    },
                ]}
            />

            <Drawer
                width={620}
                title="报告详情"
                open={Boolean(selectedReport)}
                onClose={() => setSelectedReport(null)}
                extra={
                    selectedReport && (
                        <Space>
                            <Button icon={<CloudDownloadOutlined />} onClick={async () => { if (!selectedReport) return; await downloadManagedReport(selectedReport); message.success(`已开始下载：${selectedReport.latestFileName}`); }}>
                                下载
                            </Button>
                            <Button type="primary" onClick={() => handleReexport(selectedReport, 'pdf')}>
                                重新导出 PDF
                            </Button>
                        </Space>
                    )
                }
            >
                {selectedReport && (
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="报告编号">{selectedReport.reportId}</Descriptions.Item>
                        <Descriptions.Item label="报告名称">{selectedReport.reportName}</Descriptions.Item>
                        <Descriptions.Item label="报告类型">{REPORT_TYPE_TEXT[selectedReport.reportType]}</Descriptions.Item>
                        <Descriptions.Item label="电厂">{selectedReport.plant}</Descriptions.Item>
                        <Descriptions.Item label="专业">{selectedReport.major}</Descriptions.Item>
                        <Descriptions.Item label="年份">{selectedReport.year}</Descriptions.Item>
                        <Descriptions.Item label="状态">
                            <Tag color={STATUS_COLOR[selectedReport.status]}>{STATUS_TEXT[selectedReport.status]}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="创建人">{selectedReport.createdBy}</Descriptions.Item>
                        <Descriptions.Item label="最新文件">{selectedReport.latestFileName}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>

            <Drawer width={520} title="模板详情" open={Boolean(templateDetail)} onClose={() => setTemplateDetail(null)}>
                {templateDetail && (
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="模板名称">{templateDetail.templateName}</Descriptions.Item>
                        <Descriptions.Item label="绑定报告类型">{REPORT_TYPE_TEXT[templateDetail.reportType]}</Descriptions.Item>
                        <Descriptions.Item label="文件名">{templateDetail.fileName}</Descriptions.Item>
                        <Descriptions.Item label="上传人">{templateDetail.uploadedBy}</Descriptions.Item>
                        <Descriptions.Item label="启用状态">{templateDetail.status === 'enabled' ? '启用' : '停用'}</Descriptions.Item>
                        <Descriptions.Item label="模板结构">{templateDetail.structure.join(' / ')}</Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>

            <Modal title="上传报告模板" open={templateModalOpen} onOk={handleCreateTemplate} onCancel={() => setTemplateModalOpen(false)}>
                <Form form={templateForm} layout="vertical">
                    <Form.Item name="templateName" label="模板名称" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="reportType" label="报告类型" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { label: '迎峰度夏检查报告', value: 'summerCheck' },
                                { label: '煤库存审计报告', value: 'coalInventoryAudit' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="fileName" label="模板文件名" rules={[{ required: true }]}>
                        <Input placeholder="例如 template.docx" />
                    </Form.Item>
                    <Upload beforeUpload={() => false} maxCount={1}>
                        <Button icon={<UploadOutlined />}>选择模板文件</Button>
                    </Upload>
                </Form>
            </Modal>

            <Modal title="编辑模板结构" open={structureModalOpen} onOk={handleSaveStructure} onCancel={() => setStructureModalOpen(false)}>
                <Form form={structureForm} layout="vertical">
                    <Form.Item name="structureText" label="章节结构（一行一个章节）" rules={[{ required: true }]}>
                        <Input.TextArea rows={8} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title="新增素材" open={materialModalOpen} onOk={handleCreateMaterial} onCancel={() => setMaterialModalOpen(false)}>
                <Form form={materialForm} layout="vertical">
                    <Form.Item name="materialName" label="素材名称" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="major" label="专业" rules={[{ required: true }]}>
                        <Select
                            options={['电气', '锅炉', '汽机', '燃料', '安全监督'].map((item) => ({
                                label: item,
                                value: item,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="fileName" label="素材文件名" rules={[{ required: true }]}>
                        <Input placeholder="例如 standard.pdf" />
                    </Form.Item>
                    <Form.Item name="fileSize" label="文件大小">
                        <Input placeholder="例如 1.2 MB" />
                    </Form.Item>
                    <Upload beforeUpload={() => false} maxCount={1}>
                        <Button icon={<UploadOutlined />}>选择素材文件</Button>
                    </Upload>
                </Form>
            </Modal>
        </main>
    );
}


