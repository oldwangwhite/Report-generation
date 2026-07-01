import { Button, Card, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import './style.css';

const { Title, Text, Paragraph } = Typography;

interface SystemPlaceholderProps {
    title: string;
    description: string;
}

/** 非本小组负责模块的预留页面。 */
export default function SystemPlaceholderPage(props: SystemPlaceholderProps) {
    return (
        <main className="placeholder-page">
            <Card>
                <Text type="secondary">模块位置预留</Text>
                <Title level={2}>{props.title}</Title>
                <Paragraph>{props.description}</Paragraph>
            </Card>
        </main>
    );
}

interface DashboardPageProps {
    role: 'user' | 'admin';
}

/** 按角色展示的平台首页概览。 */
export function DashboardPage(props: DashboardPageProps) {
    const isAdmin = props.role === 'admin';
    const navigate = useNavigate();

    return (
        <main className="placeholder-page">
            <section className="dashboard-hero">
                <Text type="secondary">技术监督辅助平台</Text>
                <Title level={2}>{isAdmin ? '管理员工作台' : '普通用户工作台'}</Title>
                <Paragraph>
                    {isAdmin
                        ? '管理员负责报告记录、模板、素材和模型配置维护，不直接承担报告生成主流程。'
                        : '普通用户负责创建报告、生成内容、查看进度、预览导出和管理自己的报告。'}
                </Paragraph>
            </section>
            <Row gutter={16}>
                {isAdmin ? (
                    <>
                        <Col span={6}>
                            <Card title="报告记录管理">
                                <Paragraph>查看全部报告、详情、下载和重新导出</Paragraph>
                                <Button type="primary" onClick={() => navigate('/admin/reports')}>
                                    进入管理
                                </Button>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card title="模板管理">
                                <Paragraph>上传、启用、停用、删除报告模板</Paragraph>
                                <Button onClick={() => navigate('/admin/templates')}>维护模板</Button>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card title="素材管理">
                                <Paragraph>维护报告生成需要的知识素材</Paragraph>
                                <Button onClick={() => navigate('/admin/materials')}>维护素材</Button>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card title="模型配置">
                                <Paragraph>维护生成模型参数和流式输出配置</Paragraph>
                                <Button onClick={() => navigate('/admin/model')}>配置模型</Button>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card title="代用户测试生成">
                                <Paragraph>管理员调试模板、素材和模型效果时使用</Paragraph>
                                <Button onClick={() => navigate('/admin/report/generate')}>测试生成</Button>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card title="我的测试报告">
                                <Paragraph>查看管理员自己测试生成的报告记录</Paragraph>
                                <Button onClick={() => navigate('/admin/my-reports')}>查看记录</Button>
                            </Card>
                        </Col>
                    </>
                ) : (
                    <>
                        <Col span={6}>
                            <Card title="报告生成">创建、大纲、章节流式生成、预览导出</Card>
                        </Col>
                        <Col span={6}>
                            <Card title="我的报告">查看个人报告、下载历史导出文件</Card>
                        </Col>
                    </>
                )}
            </Row>
        </main>
    );
}
