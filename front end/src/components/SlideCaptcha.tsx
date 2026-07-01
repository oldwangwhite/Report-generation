import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { getSlideCaptcha, verifySlideCaptcha } from '../api/auth';

type Props = {
    onVerified: (captchaId: string) => void;
};

const SLIDER_WIDTH = 50;
const IMG_WIDTH = 300;
const IMG_HEIGHT = 200;
const TRACK_WIDTH = IMG_WIDTH - SLIDER_WIDTH;

export default function SlideCaptcha({ onVerified }: Props) {
    const [bgImage, setBgImage] = useState('');
    const [sliderImage, setSliderImage] = useState('');
    const [sliderY, setSliderY] = useState(0);
    const [captchaId, setCaptchaId] = useState('');
    const [sliderLeft, setSliderLeft] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);

    const loadCaptcha = async () => {
        try {
            const data = await getSlideCaptcha();
            setBgImage(data.bgImage || data.backgroundImage || '');
            setSliderImage(data.sliderImage);
            setSliderY(data.y);
            setCaptchaId(data.captchaId);
            setSliderLeft(0);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '获取验证码失败');
        }
    };

    useEffect(() => {
        loadCaptcha();
    }, []);

    const handleTrackMouseDown = (event: React.MouseEvent) => {
        event.preventDefault();
        setIsDragging(true);
        startXRef.current = event.clientX;
    };

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging) return;
            const deltaX = event.clientX - startXRef.current;
            setSliderLeft((value) => Math.min(Math.max(0, value + deltaX), TRACK_WIDTH));
            startXRef.current = event.clientX;
        };

        const handleMouseUp = async () => {
            if (!isDragging) return;
            setIsDragging(false);
            try {
                await verifySlideCaptcha(captchaId, Math.round(sliderLeft));
                onVerified(captchaId);
            } catch (error) {
                message.error(error instanceof Error ? error.message : '验证失败，请重试');
                setSliderLeft(0);
                loadCaptcha();
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [captchaId, isDragging, onVerified, sliderLeft]);

    return (
        <div className="slide-captcha">
            <div className="slide-captcha-image">
                <img src={bgImage} width={IMG_WIDTH} height={IMG_HEIGHT} alt="验证码背景" />
                <img
                    src={sliderImage}
                    width={SLIDER_WIDTH}
                    height={SLIDER_WIDTH}
                    className="slide-captcha-piece"
                    style={{ left: sliderLeft, top: sliderY }}
                    alt="滑块"
                />
            </div>
            <div className="slide-captcha-track" onMouseDown={handleTrackMouseDown}>
                <div className="slide-captcha-handle" style={{ left: sliderLeft }}>
                    &gt;
                </div>
                <span>拖动滑块完成验证</span>
            </div>
        </div>
    );
}
