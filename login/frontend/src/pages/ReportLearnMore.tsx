import { Typography, Card, Row, Col, Divider } from 'antd';
import {
  FileTextOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DownloadOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const features = [
  {
    icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    title: '智能大纲生成',
    description: '基于预定义模板，AI 自动生成多级章节大纲，支持迎峰度夏检查报告和煤库存审计报告两种固定类型。',
  },
  {
    icon: <FileTextOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    title: '流式内容生成',
    description: '逐章节实时生成报告内容，展示总体进度（已完成章节数/总章节数），用户可实时查看每个章节的生成进度。',
  },
  {
    icon: <EditOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    title: '在线编辑与修改',
    description: '每个章节的内容生成后支持在线编辑，可修改正文内容和表格数据，所有修改自动保存。',
  },
  {
    icon: <DownloadOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    title: '一键导出 DOCX',
    description: '将生成的报告导出为格式规范的 Word 文档，保持用户所做的编辑，支持基于已保存数据重新生成和下载。',
  },
  {
    icon: <HistoryOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
    title: '历史记录管理',
    description: '记录每次报告生成的详细信息，支持分页浏览、查看、删除历史报告，并可重新导出或生成。',
  },
  {
    icon: <SettingOutlined style={{ fontSize: 32, color: '#fa541c' }} />,
    title: '模板与管理',
    description: '管理员可上传、编辑报告模板，管理专业素材，配置大语言模型参数，管理功能仅限管理员和超级管理员角色访问。',
  },
];

const ReportLearnMore = () => {
  return (
    <div style={{ background: 'transparent', padding: '0 8px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={3} style={{ color: '#fff' }}>
          <FileTextOutlined /> 报告生成系统
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
          覆盖从大纲生成、内容编写到文档导出的全流程，辅助您高效完成专业报告编写工作
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {features.map((item, index) => (
          <Col xs={24} sm={12} md={8} key={index}>
            <Card
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                height: '100%',
                transition: 'all 0.3s ease',
              }}
              bodyStyle={{ padding: 24 }}
              hoverable
            >
              <div style={{ marginBottom: 16 }}>{item.icon}</div>
              <Title level={5} style={{ color: '#fff', marginBottom: 8 }}>
                {item.title}
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.6 }}>
                {item.description}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '32px 0 24px' }} />

      <div style={{ textAlign: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          * 管理功能（模板管理、素材管理、模型配置）仅限管理员和超级管理员角色访问
        </Text>
      </div>
    </div>
  );
};

export default ReportLearnMore;
