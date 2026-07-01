import { Typography, Card, Row, Col, Divider } from 'antd';
import {
  DatabaseOutlined,
  UploadOutlined,
  FileSearchOutlined,
  ApartmentOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const features = [
  {
    icon: <DatabaseOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    title: '知识库管理',
    description:
      '创建、编辑、删除知识库，按文档类型分类（规程规范、技术报告、术语条目等），配置语义向量或向量+重排序检索策略。',
  },
  {
    icon: <UploadOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    title: '文档管理',
    description:
      '支持 PDF、DOCX、PPTX、XLSX、MD、TXT 及常见图片格式上传，拖拽或点击上传，为文档添加标签，全流程状态跟踪（上传、解析、切片、向量化、就绪、失败），支持重试和批量操作。',
  },
  {
    icon: <FileSearchOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    title: '文档解析与处理',
    description:
      '自动解析文档为文本，按分段策略进行语义切片，向量化嵌入后持久化存储至向量数据库，支持并发控制和多种解析后端切换。',
  },
  {
    icon: <ApartmentOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    title: '知识检索',
    description:
      '普通用户可在前台跨知识库联合检索，支持语义向量检索及向量+重排序两种模式，支持相似度阈值过滤和标签元数据过滤，展示文档名称、相关度分数和内容摘要。',
  },
  {
    icon: <SettingOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
    title: '系统配置',
    description:
      '运行时配置嵌入模型和重排序模型参数（模型名称、API 地址、向量维度、Top N 等），配置变更无需重启服务，即时生效。',
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#fa541c' }} />,
    title: '策略联动',
    description:
      '知识库的分段策略或检索策略变更时，自动触发后台重新处理所有就绪状态的文档，确保索引与策略同步。',
  },
  {
    icon: <DeploymentUnitOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
    title: '本地部署',
    description:
      '支持嵌入模型和重排序模型在内网环境本地化部署，实现完全离线运行，保持与云端 API 一致的功能体验。',
  },
];

const KnowledgeLearnMore = () => {
  return (
    <div style={{ background: 'transparent', padding: '0 8px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={3} style={{ color: '#fff' }}>
          <DatabaseOutlined /> 知识库管理系统
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
          支撑知识库全生命周期管理，提供文档上传、解析、检索与策略配置，为智能问答和报告生成奠定数据基础
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
          * 管理功能（知识库配置、文档处理策略、模型配置等）仅限管理员和超级管理员角色访问
        </Text>
      </div>
    </div>
  );
};

export default KnowledgeLearnMore;
