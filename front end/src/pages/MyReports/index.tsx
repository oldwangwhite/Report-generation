import { CloudDownloadOutlined, DeleteOutlined, EyeOutlined, FileSyncOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Drawer, Popconfirm, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { downloadExportFile } from '../../services/reportService';
import type { ExportFormat, ReportStatus, ReportType } from '../../types/report';
import './style.css';

const { Title, Text, Paragraph } = Typography;

interface MyReport {
    reportId: string;
    reportName: string;
    reportType: ReportType;
    status: ReportStatus;
    updatedAt: string;
    latestFileName: string;
    exportStatus: 'none' | 'exporting' | 'exported' | 'failed';
    outline: string[];
    chapters: Array<{ title: string; status: ReportStatus; content: string }>;
}

const REPORT_TYPE_TEXT: Record<ReportType, string> = {
    summerCheck: '迎峰度夏检查报告',
    coalInventoryAudit: '煤库存审计报告',
};

const STATUS_TEXT: Partial<Record<ReportStatus, string>> = {
    draft: '草稿',
    generated: '已生成',
    exported: '已导出',
    generateFailed: '生成失败',
};

const INITIAL_REPORTS: MyReport[] = [
    {
        reportId: 'MY-001',
        reportName: 'XX电厂迎峰度夏检查报告',
        reportType: 'summerCheck',
        status: 'exported',
        updatedAt: '2026-06-27 16:30',
        latestFileName: 'XX电厂迎峰度夏检查报告.docx',
        exportStatus: 'exported',
        outline: ['1 检查概况', '2 重点检查内容', '3 问题分析与整改建议', '4 结论'],
        chapters: [
            { title: '检查概况', status: 'generated', content: '已完成检查背景、范围和对象说明。' },
            { title: '重点检查内容', status: 'generated', content: '包含设备运行、隐患排查和整改情况。' },
        ],
    },
    {
        reportId: 'MY-002',
        reportName: 'A电厂煤库存专项审计报告',
        reportType: 'coalInventoryAudit',
        status: 'generated',
        updatedAt: '2026-06-28 09:12',
        latestFileName: 'A电厂煤库存专项审计报告.pdf',
        exportStatus: 'exported',
        outline: ['1 审计概况', '2 库存核查', '3 问题说明', '4 结论'],
        chapters: [
            { title: '审计概况', status: 'generated', content: '已完成煤库存审计范围和依据说明。' },
            { title: '库存核查', status: 'generated', content: '已生成库存盘点表格和差异分析。' },
        ],
    },
];


function getFormatFromFileName(fileName: string): ExportFormat {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext === 'pdf' || ext === 'md' || ext === 'txt' ? ext : 'docx';
}

async function downloadMockReport(record: MyReport) {
    await downloadExportFile({
        exportId: `mock-${record.reportId}`,
        reportId: record.reportId,
        fileName: record.latestFileName || `${record.reportName}.docx`,
        fileFormat: getFormatFromFileName(record.latestFileName),
        fileSize: 0,
        downloadUrl: `/api/reports/${record.reportId}/exports/latest/download`,
        status: 'exported',
        createdAt: record.updatedAt,
    });
}
/** 普通用户的个人报告记录页，只展示和下载自己的报告。 */
export default function MyReportsPage() {
    const [reports, setReports] = useState(INITIAL_REPORTS);
    const [selectedReport, setSelectedReport] = useState<MyReport | null>(null);

    const handleReexport = (record: MyReport) => {
        setReports((prev) =>
            prev.map((item) =>
                item.reportId === record.reportId
                    ? { ...item, exportStatus: 'exported', latestFileName: `${item.reportName}.docx`, updatedAt: '刚刚' }
                    : item,
            ),
        );
        message.success('已基于保存数据重新导出 Word');
    };

    const handleDelete = (reportId: string) => {
        setReports((prev) => prev.filter((item) => item.reportId !== reportId));
        if (selectedReport?.reportId === reportId) setSelectedReport(null);
        message.success('已删除自己的报告记录');
    };

    const handleDownload = (record: MyReport) => {
        const blob = new Blob(
            [
                `报告编号：${record.reportId}\n`,
                `报告名称：${record.reportName}\n`,
                `报告类型：${REPORT_TYPE_TEXT[record.reportType]}\n`,
                `导出状态：${record.exportStatus}\n`,
                '这是普通用户端 mock 下载文件，后续后端完成后会替换为真实文件流。\n',
            ],
            { type: 'text/plain;charset=utf-8' },
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = record.latestFileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        message.success('已开始下载，文件会保存到浏览器默认下载目录');
    };

    const columns: ColumnsType<MyReport> = [
        { title: '报告名称', dataIndex: 'reportName' },
        {
            title: '报告类型',
            dataIndex: 'reportType',
            render: (value: ReportType) => REPORT_TYPE_TEXT[value],
        },
        {
            title: '状态',
            dataIndex: 'status',
            render: (value: ReportStatus) => <Tag color={value === 'exported' ? 'success' : 'processing'}>{STATUS_TEXT[value] || value}</Tag>,
        },
        { title: '更新时间', dataIndex: 'updatedAt' },
        {
            title: '操作',
            width: 300,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedReport(record)}>
                        查看
                    </Button>
                    <Button size="small" icon={<CloudDownloadOutlined />} onClick={() => handleDownload(record)}>
                        下载
                    </Button>
                    <Button size="small" icon={<FileSyncOutlined />} onClick={() => handleReexport(record)}>
                        重新导出
                    </Button>
                    <Popconfirm title="确认删除自己的报告记录？" onConfirm={() => handleDelete(record.reportId)}>
                        <Button size="small" danger icon={<DeleteOutlined />}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <main className="my-reports-page">
            <section className="my-reports-hero">
                <Text type="secondary">普通用户 / 我的报告</Text>
                <Title level={2}>我的报告记录</Title>
                <Paragraph>普通用户只能查看、预览和下载自己创建的报告，不进入模板、素材和模型管理页面。</Paragraph>
            </section>
            <Card title="我的报告列表">
                <Table rowKey="reportId" columns={columns} dataSource={reports} pagination={false} />
            </Card>
            <Drawer width={720} title="我的报告详情" open={Boolean(selectedReport)} onClose={() => setSelectedReport(null)}>
                {selectedReport && (
                    <Tabs
                        items={[
                            {
                                key: 'base',
                                label: '基本信息',
                                children: (
                                    <Descriptions bordered column={1}>
                                        <Descriptions.Item label="报告编号">{selectedReport.reportId}</Descriptions.Item>
                                        <Descriptions.Item label="报告名称">{selectedReport.reportName}</Descriptions.Item>
                                        <Descriptions.Item label="报告类型">{REPORT_TYPE_TEXT[selectedReport.reportType]}</Descriptions.Item>
                                        <Descriptions.Item label="导出状态">{selectedReport.exportStatus}</Descriptions.Item>
                                        <Descriptions.Item label="最新文件">{selectedReport.latestFileName}</Descriptions.Item>
                                    </Descriptions>
                                ),
                            },
                            {
                                key: 'outline',
                                label: '大纲',
                                children: selectedReport.outline.map((item) => <p key={item}>{item}</p>),
                            },
                            {
                                key: 'content',
                                label: '章节内容',
                                children: selectedReport.chapters.map((chapter) => (
                                    <Card key={chapter.title} size="small" title={chapter.title} className="chapter-detail-card">
                                        <Tag color="success">已完成</Tag>
                                        <Paragraph>{chapter.content}</Paragraph>
                                    </Card>
                                )),
                            },
                        ]}
                    />
                )}
            </Drawer>
        </main>
    );
}


