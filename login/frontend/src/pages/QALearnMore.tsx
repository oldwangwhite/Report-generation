import { Typography, Card, Row, Col, Divider } from 'antd';
import {
  MessageOutlined,
  ThunderboltOutlined,
  ApartmentOutlined,
  SafetyOutlined,
  BulbOutlined,
  SettingOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const features = [
  {
    icon: <MessageOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    title: '智能对话',
    description: '基于大语言模型的多轮对话，支持流式输出（SSE）实时展示生成内容，自然语言交互。',
  },
  {
    icon: <ApartmentOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    title: '多会话管理',
    description: '支持创建、切换、删除多个会话，会话历史本地持久化，页面刷新自动恢复。',
  },
  {
    icon: <SearchOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    title: '意图识别与路由',
    description: '自动识别用户意图（知识问答、一般对话等），根据意图路由到对应处理模块。',
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    title: 'RAG 增强检索',
    description: '跨多个知识库联合检索，支持语义向量检索及向量+重排序两种模式，可配置 Top K、相似度阈值。',
  },
  {
    icon: <SafetyOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
    title: '引用溯源',
    description: '回答中标注引用文档片段，可查看原文片段、来源文档名称、相关性分数，支持下载原文件。',
  },
  {
    icon: <BulbOutlined style={{ fontSize: 32, color: '#fa541c' }} />,
    title: '思考过程展示',
    description: '展示多步思考过程，让用户了解处理链路，流式完成后自动折叠，支持手动展开。',
  },
  {
    icon: <SettingOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
    title: '管理配置',
    description: '管理员可配置问答参数（术语库、技术库、Top K、阈值等），提供检索测试页面和大模型配置。',
  },
];

const QALearnMore = () => {
  return (
    <div style={{ background: 'transparent', padding: '0 8px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={3} style={{ color: '#fff' }}>
          <MessageOutlined /> 知识问答系统
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
          基于大语言模型和 RAG 技术，提供精准知识检索、智能对话和答案溯源能力
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
          * 管理功能仅限管理员和超级管理员角色访问
        </Text>
      </div>
    </div>
  );
};

export default QALearnMore;