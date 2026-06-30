import { CloudDownloadOutlined, DeleteOutlined, EyeOutlined, FileSyncOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Drawer, Empty, Popconfirm, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
    deleteReport,
    downloadExportFile,
    getReportDetailById,
    listReportExports,
    listReports,
    reexportReport,
} from '../../services/reportService';
import type { ExportFile, Report, ReportDetail, ReportStatus, ReportType } from '../../types/report';
import './style.css';

const { Title, Text, Paragraph } = Typography;

const REPORT_TYPE_TEXT: Record<ReportType, string> = {
    summerCheck: '迎峰度夏检查报告',
    coalInventoryAudit: '煤库存审计报告',
};

const STATUS_TEXT: Partial<Record<ReportStatus, string>> = {
    draft: '草稿',
    outlineGenerated: '大纲已生成',
    generating: '生成中',
    generated: '已生成',
    exporting: '导出中',
    exported: '已导出',
    generateFailed: '生成失败',
    exportFailed: '导出失败',
};

const STATUS_COLOR: Partial<Record<ReportStatus, string>> = {
    draft: 'default',
    outlineGenerated: 'processing',
    generating: 'processing',
    generated: 'success',
    exporting: 'processing',
    exported: 'success',
    generateFailed: 'error',
    exportFailed: 'error',
};

function formatDateTime(value?: string) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.replace('T', ' ').replace(/\+.*$/, '');
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 普通用户的个人报告记录页，只展示和下载自己的报告。 */
export default function MyReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [latestExports, setLatestExports] = useState<Record<string, ExportFile | null>>({});
    const [selectedDetail, setSelectedDetail] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [actioningId, setActioningId] = useState('');

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
            message.error(error instanceof Error ? error.message : '报告列表加载失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleView = async (record: Report) => {
        setActioningId(record.reportId);
        try {
            setSelectedDetail(await getReportDetailById(record.reportId));
        } catch (error) {
            message.error(error instanceof Error ? error.message : '报告详情加载失败');
        } finally {
            setActioningId('');
        }
    };

    const handleReexport = async (record: Report) => {
        setActioningId(record.reportId);
        try {
            const file = await reexportReport(record.reportId, 'docx');
            setLatestExports((prev) => ({ ...prev, [record.reportId]: file }));
            setReports((prev) => prev.map((item) => (item.reportId === record.reportId ? { ...item, status: 'exported' } : item)));
            message.success('已重新导出 DOCX');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '重新导出失败');
        } finally {
            setActioningId('');
        }
    };

    const handleDelete = async (reportId: string) => {
        setActioningId(reportId);
        try {
            await deleteReport(reportId);
            setReports((prev) => prev.filter((item) => item.reportId !== reportId));
            setLatestExports((prev) => {
                const next = { ...prev };
                delete next[reportId];
                return next;
            });
            if (selectedDetail?.report.reportId === reportId) setSelectedDetail(null);
            message.success('已删除报告记录');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '删除失败');
        } finally {
            setActioningId('');
        }
    };

    const handleDownload = async (record: Report) => {
        const file = latestExports[record.reportId];
        if (!file) {
            message.warning('该报告还没有导出文件，请先重新导出');
            return;
        }
        setActioningId(record.reportId);
        try {
            await downloadExportFile(file);
            message.success(`已开始下载：${file.fileName}`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '下载失败');
        } finally {
            setActioningId('');
        }
    };

    const columns: ColumnsType<Report> = [
        { title: '报告名称', dataIndex: 'reportName' },
        {
            title: '报告类型',
            dataIndex: 'reportType',
            width: 180,
            render: (value: ReportType) => REPORT_TYPE_TEXT[value] || value,
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 130,
            render: (value: ReportStatus) => <Tag color={STATUS_COLOR[value]}>{STATUS_TEXT[value] || value}</Tag>,
        },
        { title: '电厂', dataIndex: 'plant', width: 130, render: (value?: string) => value || '-' },
        { title: '年份', dataIndex: 'year', width: 90, render: (value?: number) => value || '-' },
        { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (value?: string) => formatDateTime(value) },
        {
            title: '最新文件',
            width: 220,
            render: (_, record) => latestExports[record.reportId]?.fileName || '-',
        },
        {
            title: '操作',
            width: 320,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} loading={actioningId === record.reportId} onClick={() => handleView(record)}>
                        查看
                    </Button>
                    <Button size="small" icon={<CloudDownloadOutlined />} onClick={() => handleDownload(record)}>
                        下载
                    </Button>
                    <Button size="small" icon={<FileSyncOutlined />} loading={actioningId === record.reportId} onClick={() => handleReexport(record)}>
                        重新导出
                    </Button>
                    <Popconfirm title="确认删除自己的报告记录？" onConfirm={() => handleDelete(record.reportId)}>
                        <Button size="small" danger icon={<DeleteOutlined />} loading={actioningId === record.reportId}>
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
                <Paragraph>普通用户只能查看、预览、重新导出、下载和删除自己创建的报告。</Paragraph>
            </section>
            <Card
                title="我的报告列表"
                extra={
                    <Button icon={<ReloadOutlined />} onClick={loadReports} loading={loading}>
                        刷新
                    </Button>
                }
            >
                <Table
                    rowKey="reportId"
                    columns={columns}
                    dataSource={reports}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: <Empty description="暂无报告记录" /> }}
                />
            </Card>
            <Drawer width={760} title="我的报告详情" open={Boolean(selectedDetail)} onClose={() => setSelectedDetail(null)}>
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
                                        <Descriptions.Item label="电厂">{selectedDetail.report.plant || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="专业">{selectedDetail.report.major || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="年份">{selectedDetail.report.year || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="状态">{STATUS_TEXT[selectedDetail.report.status] || selectedDetail.report.status}</Descriptions.Item>
                                        <Descriptions.Item label="更新时间">{formatDateTime(selectedDetail.report.updatedAt)}</Descriptions.Item>
                                        <Descriptions.Item label="最新文件">{selectedDetail.latestExport?.fileName || '-'}</Descriptions.Item>
                                    </Descriptions>
                                ),
                            },
                            {
                                key: 'outline',
                                label: '大纲',
                                children: selectedDetail.outline.length ? (
                                    selectedDetail.outline.map((item) => (
                                        <p key={item.chapterId}>
                                            {item.chapterNo} {item.title}
                                        </p>
                                    ))
                                ) : (
                                    <Empty description="暂无大纲" />
                                ),
                            },
                            {
                                key: 'content',
                                label: '章节内容',
                                children: selectedDetail.contents.length ? (
                                    selectedDetail.contents.map((chapter) => {
                                        const outline = selectedDetail.outline.find((item) => item.chapterId === chapter.chapterId);
                                        return (
                                            <Card key={chapter.chapterId} size="small" title={outline ? `${outline.chapterNo} ${outline.title}` : chapter.chapterId} className="chapter-detail-card">
                                                <Tag color="success">已保存</Tag>
                                                <Paragraph>{chapter.content || '暂无正文内容'}</Paragraph>
                                            </Card>
                                        );
                                    })
                                ) : (
                                    <Empty description="暂无章节正文" />
                                ),
                            },
                        ]}
                    />
                )}
            </Drawer>
        </main>
    );
}
