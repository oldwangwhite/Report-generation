import {
    ArrowLeftOutlined,
    ArrowRightOutlined,
    DatabaseOutlined,
    FileTextOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import { Button, Modal, Spin, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHomeModules, type HomeModule } from '../../api/module';
import { getDefaultPathByRole, getUserRole } from '../../utils/auth';
import { useAuth } from '../../store/useAuth';
import './style.css';

const { Title, Paragraph } = Typography;

const iconMap: Record<string, React.ReactNode> = {
    qa: <MessageOutlined />,
    report: <FileTextOutlined />,
    knowledge: <DatabaseOutlined />,
};

export default function PublicHome() {
    const [modules, setModules] = useState<(HomeModule & { icon: React.ReactNode })[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showLearnMore, setShowLearnMore] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        fetchHomeModules()
            .then((res) => {
                setModules(res.data.map((item) => ({ ...item, icon: iconMap[item.id] || <MessageOutlined /> })));
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!modules.length) return;
        const timer = window.setInterval(() => {
            setCurrentIndex((value) => (value + 1) % modules.length);
        }, 5000);
        return () => window.clearInterval(timer);
    }, [modules.length]);

    const goNext = useCallback(() => {
        setCurrentIndex((value) => (value + 1) % modules.length);
    }, [modules.length]);

    const goPrev = useCallback(() => {
        setCurrentIndex((value) => (value - 1 + modules.length) % modules.length);
    }, [modules.length]);

    const handleStart = () => {
        if (user) {
            navigate(getDefaultPathByRole(getUserRole()), { replace: true });
        } else {
            navigate('/login', { replace: true });
        }
    };

    if (loading) {
        return (
            <div className="public-loading">
                <Spin size="large" />
            </div>
        );
    }

    const currentModule = modules[currentIndex];

    return (
        <main className="public-home">
            <section className="public-hero">
                <div className="hero-copy">
                    <span className="hero-eyebrow">人工智能</span>
                    <Title level={1}>智能知识管理与报告生成系统</Title>
                    <Paragraph>
                        基于大语言模型的电力技术监督辅助平台，将知识检索、素材沉淀、报告生成和导出流程统一到可执行的工作台。
                    </Paragraph>
                </div>

                <div className="module-stage">
                    <div className="module-copy">
                        <div className="module-title-row">
                            <div className="module-icon" style={{ background: currentModule.gradient }}>
                                {currentModule.icon}
                            </div>
                            <div>
                                <h2>{currentModule.title}</h2>
                                <span>{currentModule.subtitle}</span>
                            </div>
                        </div>
                        <p>{currentModule.description}</p>
                        <div className="module-features">
                            {currentModule.features.map((feature) => (
                                <span key={feature} style={{ color: currentModule.color, borderColor: `${currentModule.color}55` }}>
                                    {feature}
                                </span>
                            ))}
                        </div>
                        <div className="module-actions">
                            <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={handleStart}>
                                立即体验
                            </Button>
                            <Button size="large" onClick={() => setShowLearnMore(true)}>
                                了解更多
                            </Button>
                        </div>
                    </div>
                    <div className="module-media">
                        <img src={currentModule.imageUrl} alt={currentModule.title} />
                    </div>
                </div>

                <div className="module-controls">
                    <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={goPrev} />
                    <div className="module-dots">
                        {modules.map((item, index) => (
                            <button
                                key={item.id}
                                className={index === currentIndex ? 'active' : ''}
                                onClick={() => setCurrentIndex(index)}
                                aria-label={item.title}
                            />
                        ))}
                    </div>
                    <Button shape="circle" icon={<ArrowRightOutlined />} onClick={goNext} />
                </div>
            </section>

            <Modal open={showLearnMore} footer={null} width={760} onCancel={() => setShowLearnMore(false)} title={currentModule.title}>
                <div className="learn-more">
                    <p>{currentModule.description}</p>
                    <ul>
                        {currentModule.features.map((feature) => (
                            <li key={feature}>{feature}</li>
                        ))}
                    </ul>
                </div>
            </Modal>
        </main>
    );
}
