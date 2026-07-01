import { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Spin, Modal } from 'antd';
import { fetchHomeModules } from '../api/module';
import {
  MessageOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/useAuth';
import ReportLearnMore from './ReportLearnMore';
import QALearnMore from './QALearnMore';
import KnowledgeLearnMore from './KnowledgeLearnMore';

const { Title, Paragraph } = Typography;

const iconMap: Record<string, React.ReactNode> = {
  qa: <MessageOutlined />,
  report: <FileTextOutlined />,
  knowledge: <DatabaseOutlined />,
};

const PublicHome = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [learnMoreModuleId, setLearnMoreModuleId] = useState('');

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchHomeModules()
      .then((res: any) => {
        const moduleList = res.data || [];
        setModules(
          moduleList.map((item: any) => ({
            ...item,
            icon: iconMap[item.id] || <MessageOutlined />,
          }))
        );
      })
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || modules.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % modules.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, modules]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % modules.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [modules]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + modules.length) % modules.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [modules]);

  const handleStart = () => {
    if (user) {
      navigate('/protected', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 112px)', background: '#f0f5ff' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div style={{ color: '#333', textAlign: 'center', paddingTop: 200, background: '#f0f5ff', height: '100vh' }}>
        暂无模块数据
      </div>
    );
  }

  const currentModule = modules[currentIndex];

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 64px - 48px)', overflow: 'hidden', background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 50%, #ffffff 100%)' }}>
      {/* 背景装饰 */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(24,144,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(24,144,255,0.04) 1px, transparent 1px)`, backgroundSize: '50px 50px', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: '20%', right: '10%', width: 400, height: 400, background: `radial-gradient(circle, rgba(24,144,255,0.08) 0%, transparent 70%)`, borderRadius: '50%', filter: 'blur(60px)', transition: 'all 0.8s ease', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 300, height: 300, background: `radial-gradient(circle, rgba(82,196,26,0.08) 0%, transparent 70%)`, borderRadius: '50%', filter: 'blur(50px)', transition: 'all 0.8s ease', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px - 48px)', padding: '0 48px' }}>
        {/* 标题 */}
        <div style={{ paddingTop: 40, marginBottom: 20 }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(24,144,255,0.1)', border: '1px solid rgba(24,144,255,0.3)', borderRadius: 4, marginBottom: 16 }}>
            <span style={{ color: '#1890ff', fontSize: 14, fontWeight: 500, letterSpacing: 2 }}>人工智能</span>
          </div>
          <Title level={1} style={{ color: '#1a1a2e', fontSize: 48, fontWeight: 700, lineHeight: 1.2, margin: 0, maxWidth: 600 }}>
            智能知识管理与<br />报告生成系统
          </Title>
          <Paragraph style={{ color: '#444', fontSize: 18, maxWidth: 500, marginTop: 20, lineHeight: 1.6 }}>
            基于大语言模型的企业级知识管理平台，将复杂的电力规程工作流转化为可重复、可执行的任务。
          </Paragraph>
        </div>

        {/* 轮播区 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', gap: 60, alignItems: 'center' }}>
            {/* 左侧文字 */}
            <div style={{ flex: 1, maxWidth: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, opacity: 0, animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.1s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: currentModule.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', boxShadow: `0 0 20px ${currentModule.color}40` }}>
                  {currentModule.icon}
                </div>
                <div>
                  <div style={{ color: '#1a1a2e', fontSize: 28, fontWeight: 600 }}>{currentModule.title}</div>
                  <div style={{ color: '#666', fontSize: 14, letterSpacing: 1 }}>{currentModule.subtitle}</div>
                </div>
              </div>
              <Paragraph style={{ color: '#333', fontSize: 16, lineHeight: 1.8, marginBottom: 24, opacity: 0, animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.2s' }}>
                {currentModule.description}
              </Paragraph>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32, opacity: 0, animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.3s' }}>
                {currentModule.features.map((feature: string, idx: number) => (
                  <span key={idx} style={{ padding: '6px 14px', background: '#fff', border: `1px solid ${currentModule.color}40`, borderRadius: 20, color: currentModule.color, fontSize: 13, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>{feature}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, opacity: 0, animation: 'fadeInUp 0.6s ease forwards', animationDelay: '0.4s' }}>
                <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={handleStart} style={{ background: '#1890ff', borderColor: '#1890ff', borderRadius: 6, height: 44, padding: '0 28px', fontSize: 15, fontWeight: 500 }}>立即体验</Button>
                <Button size="large" style={{ background: '#fff', borderColor: '#d9d9d9', color: '#333', borderRadius: 6, height: 44, padding: '0 28px', fontSize: 15 }}>了解更多</Button>
              </div>
            </div>

            {/* 右侧图片卡片 */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: 480, height: 320, background: '#fff', border: `1px solid ${currentModule.color}30`, borderRadius: 16, overflow: 'hidden', position: 'relative', opacity: 0, animation: 'fadeInScale 0.8s ease forwards', animationDelay: '0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)', backdropFilter: 'blur(10px)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: currentModule.gradient, zIndex: 2 }} />
                <img
                  src={currentModule.imageUrl}
                  alt={currentModule.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement!;
                    parent.style.background = currentModule.gradient;
                    parent.style.display = 'flex';
                    parent.style.alignItems = 'center';
                    parent.style.justifyContent = 'center';
                    parent.innerHTML += `<span style="color:#fff;font-size:18px;opacity:0.9;">${currentModule.title} 示意图</span>`;
                  }}
                />
                <div style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, border: `2px solid ${currentModule.color}20`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, backdropFilter: 'blur(4px)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${currentModule.color}30`, border: `2px solid ${currentModule.color}50` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部控制栏 */}
        <div style={{ padding: '24px 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={goPrev} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid #d9d9d9', background: '#fff', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}><ArrowLeftOutlined /></button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {modules.map((module, index) => (
              <button key={module.id} onClick={() => goToSlide(index)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, border: 'none', background: index === currentIndex ? 'rgba(24,144,255,0.08)' : 'transparent', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                <div style={{ width: index === currentIndex ? 24 : 8, height: 8, borderRadius: 4, background: index === currentIndex ? '#1890ff' : '#c0c0c0', transition: 'all 0.3s ease', boxShadow: index === currentIndex ? '0 0 6px rgba(24,144,255,0.5)' : 'none' }} />
                {index === currentIndex && <span style={{ color: '#1890ff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{module.title}</span>}
              </button>
            ))}
          </div>
          <button onClick={goNext} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid #d9d9d9', background: '#fff', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}><ArrowRightOutlined /></button>
        </div>
        <Paragraph style={{ color: '#999', fontSize: 14, textAlign: 'center', margin: '0 0 24px' }}>
          更多功能请登录后使用
        </Paragraph>
      </div>

      {/* 了解更多模态框 */}
      <Modal
        title={null}
        open={showLearnMore}
        onCancel={() => setShowLearnMore(false)}
        footer={null}
        width={900}
        destroyOnHidden
        style={{ top: 40 }}
        bodyStyle={{ background: '#fff', padding: '32px 40px', borderRadius: 16 }}
        maskStyle={{ background: 'rgba(0,0,0,0.45)' }}
      >
        {learnMoreModuleId === 'report' && <ReportLearnMore />}
        {learnMoreModuleId === 'qa' && <QALearnMore />}
        {learnMoreModuleId === 'knowledge' && <KnowledgeLearnMore />}
      </Modal>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default PublicHome;