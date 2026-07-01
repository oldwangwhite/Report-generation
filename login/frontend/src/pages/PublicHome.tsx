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

const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const moduleImageMap: Record<string, string> = {
  qa: svgToDataUri(
    '<svg width="480" height="320" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="320" rx="0" fill="#ecfdf5"/><rect x="70" y="70" width="340" height="180" rx="16" fill="#fff"/><circle cx="120" cy="120" r="24" fill="#0f766e"/><rect x="160" y="100" width="190" height="14" rx="7" fill="#94d3a6"/><rect x="160" y="130" width="230" height="14" rx="7" fill="#cef7e0"/><rect x="90" y="170" width="300" height="48" rx="10" fill="#f0fdf4"/></svg>',
  ),
  report: svgToDataUri(
    '<svg width="480" height="320" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="320" fill="#eff6ff"/><rect x="128" y="40" width="224" height="240" rx="14" fill="#fff" stroke="#bdd7ff" stroke-width="2"/><path d="M300 40v54h52" fill="#dbeafe"/><path d="M300 40l52 54" fill="none" stroke="#93c5fd" stroke-width="2"/><rect x="160" y="86" width="128" height="18" rx="9" fill="#1769e0"/><rect x="160" y="126" width="154" height="12" rx="6" fill="#94c5fd"/><rect x="160" y="154" width="130" height="12" rx="6" fill="#bdd7ff"/><rect x="160" y="182" width="168" height="12" rx="6" fill="#bdd7ff"/><rect x="160" y="218" width="126" height="34" rx="8" fill="#dbeafe"/><rect x="296" y="218" width="28" height="34" rx="6" fill="#60a5fa"/></svg>',
  ),
  knowledge: svgToDataUri(
    '<svg width="480" height="320" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="320" fill="#faf5ff"/><rect x="92" y="72" width="78" height="178" rx="10" fill="#7c3aed"/><rect x="186" y="54" width="82" height="196" rx="10" fill="#a78bfa"/><rect x="284" y="86" width="86" height="164" rx="10" fill="#db2777"/><rect x="112" y="112" width="38" height="10" rx="5" fill="#fff"/><rect x="112" y="134" width="28" height="8" rx="4" fill="#ddd6fe"/><rect x="208" y="98" width="38" height="10" rx="5" fill="#fff"/><rect x="208" y="120" width="30" height="8" rx="4" fill="#ede9fe"/><rect x="306" y="132" width="42" height="10" rx="5" fill="#fff"/><rect x="306" y="154" width="30" height="8" rx="4" fill="#fce7f3"/><rect x="82" y="250" width="306" height="16" rx="8" fill="#e9d5ff"/></svg>',
  ),
};

const getModuleImage = (id: string) => moduleImageMap[id] || moduleImageMap.qa;

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
            imageUrl: item.imageUrl || getModuleImage(item.id),
            fallbackImageUrl: getModuleImage(item.id),
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
                <Button
                  size="large"
                  onClick={() => {
                    setLearnMoreModuleId(currentModule.id);
                    setShowLearnMore(true);
                  }}
                  style={{ background: '#fff', borderColor: '#d9d9d9', color: '#333', borderRadius: 6, height: 44, padding: '0 28px', fontSize: 15 }}
                >
                  了解更多
                </Button>
              </div>
            </div>

            {/* 右侧图片卡片 */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: 480, height: 320, background: '#fff', border: `1px solid ${currentModule.color}30`, borderRadius: 16, overflow: 'hidden', position: 'relative', opacity: 0, animation: 'fadeInScale 0.8s ease forwards', animationDelay: '0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)', backdropFilter: 'blur(10px)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: currentModule.gradient, zIndex: 2 }} />
                <img
                  src={currentModule.imageUrl || currentModule.fallbackImageUrl}
                  alt={currentModule.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = currentModule.fallbackImageUrl || getModuleImage(currentModule.id);
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
