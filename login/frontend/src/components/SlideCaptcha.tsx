import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { getSlideCaptcha, verifySlideCaptcha } from '../api/auth';

interface SlideCaptchaProps {
  onVerified: (captchaId: string) => void;
}

const SLIDER_WIDTH = 50;
const IMG_WIDTH = 300;
const IMG_HEIGHT = 200;
const TRACK_WIDTH = IMG_WIDTH - SLIDER_WIDTH;   // 轨道长度

const SlideCaptcha: React.FC<SlideCaptchaProps> = ({ onVerified }) => {
  const [bgImage, setBgImage] = useState('');
  const [sliderImage, setSliderImage] = useState('');
  const [sliderY, setSliderY] = useState(0);
  const [captchaId, setCaptchaId] = useState('');
  const [sliderLeft, setSliderLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = React.useRef(0);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const loadCaptcha = async () => {
    try {
      const res = await getSlideCaptcha();
      const data = res.data;
      setBgImage(data.bgImage);
      setSliderImage(data.sliderImage);
      setSliderY(data.y);
      setCaptchaId(data.captchaId);
      setSliderLeft(0);
    } catch {
      message.error('获取验证码失败');
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  // ---------- 轨道上拖动逻辑 ----------
  const handleTrackMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    setSliderLeft((prev) => {
      const newLeft = Math.min(Math.max(0, prev + deltaX), TRACK_WIDTH);
      return newLeft;
    });
    startXRef.current = e.clientX;
  };

  const handleMouseUp = async () => {
    if (!isDragging) return;
    setIsDragging(false);
    const distance = Math.round(sliderLeft);
    try {
      await verifySlideCaptcha(captchaId, distance);
      onVerified(captchaId);
    } catch {
      message.error('验证失败，请重试');
      setSliderLeft(0);
      loadCaptcha();      // 失败后自动刷新
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, sliderLeft, captchaId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 背景图与缺口显示 */}
      <div style={{ position: 'relative', width: IMG_WIDTH, height: IMG_HEIGHT, marginBottom: 8 }}>
        <img src={bgImage} width={IMG_WIDTH} height={IMG_HEIGHT} style={{ display: 'block' }} alt="验证码背景" />
        <img
          src={sliderImage}
          width={SLIDER_WIDTH}
          height={SLIDER_WIDTH}
          style={{
            position: 'absolute',
            left: sliderLeft,
            top: sliderY,
            border: '1px solid #666',
            pointerEvents: 'none',      // 防止滑块自身阻挡轨道事件
          }}
          alt="滑块"
        />
      </div>

      {/* 滑块轨道 */}
      <div
        ref={trackRef}
        style={{
          width: IMG_WIDTH,
          height: 40,
          background: '#e8e8e8',
          borderRadius: 4,
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseDown={handleTrackMouseDown}
      >
        {/* 轨道内可拖动的滑块把手 */}
        <div
          style={{
            position: 'absolute',
            left: sliderLeft,
            top: 0,
            width: SLIDER_WIDTH,
            height: '100%',
            background: '#1890ff',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          ➔
        </div>
        {/* 提示文字 */}
        <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>
          拖动滑块到正确位置
        </div>
      </div>
    </div>
  );
};

export default SlideCaptcha;