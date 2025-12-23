import React, { useState } from 'react';
import './MainScreen.css';
import { Star, Info, X } from 'lucide-react';
import headerData from '../content/header.json';

// Mocking version/env for now as they are not directly available in v2 structure yet
const version = "1.6.12";

const Header = () => {
    const { logo, background } = headerData;
    const [showInfo, setShowInfo] = useState(false);

    // Placeholder for image count - in a real app this would come from props or store
    const imageCount = 0;

    const getCounterText = (n) => {
        if (n === 0) return "Add";
        return n.toString();
    };

    const getPlatformDisplay = () => {
        const p = window.Telegram?.WebApp?.platform || 'unknown';
        switch (p) {
            case 'ios': return 'Telegram for iOS';
            case 'android': return 'Telegram for Android';
            case 'macos': return 'Telegram for macOS';
            case 'tdesktop': return 'Telegram Desktop';
            case 'web':
            case 'weba':
            case 'webk':
                return 'Telegram for Web';
            default: return 'Telegram for Web (Test Enviroment)';
        }
    };

    return (
        <div className="header">
            {background && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${background})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: -1,
                        pointerEvents: 'none'
                    }}
                />
            )}

            <div className="header-control-left">
                <div className="star-counter">
                    <img src="/stars.png" alt="Stars" className="star-icon-img" />
                    <span className="counter-text">{getCounterText(imageCount)}</span>
                </div>
            </div>

            {/* Right Control: Info Button */}
            <div className="header-control-right">
                <button className="info-button" onClick={() => setShowInfo(true)}>
                    <Info size={20} />
                </button>
            </div>

            {/* Center Content: Logo */}
            <div className="header-content">
                {logo && <img src={logo} alt="Logo" className="header-logo" />}
            </div>

            {/* Info Popup */}
            {showInfo && (
                <div className="info-popup-overlay" onClick={() => setShowInfo(false)}>
                    <div className="info-popup-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setShowInfo(false)}>
                            <X size={20} />
                        </button>

                        <h2 className="popup-title">Pixel Pop</h2>
                        <div className="popup-version">{version}</div>

                        <p className="popup-details">
                            Platform: <span>{getPlatformDisplay()}</span>
                        </p>

                        <div className="popup-footer">
                            Copyright © 2024 - 2025 PIXEL POP
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Header;
