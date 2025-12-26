import React, { useState } from 'react';
import './MainScreen.css';
import { Star, Info, X, CircleX } from 'lucide-react';
import headerData from '../content/header.json';

// Mocking version/env for now as they are not directly available in v2 structure yet
const version = "0.0.3";

import { useUser } from '../context/UserContext';
import Paywall from './Paywall';
import QualitySwitcher from './QualitySwitcher';

import Skeleton from './Skeleton';

const Header = () => {
    const { logo, background } = headerData;
    const [showInfo, setShowInfo] = useState(false);
    const { user, loading, openPaywall, isPremiumMode } = useUser();

    // Use credits based on mode
    const credits = isPremiumMode ? (user?.premium_credits || 0) : (user?.credits || 0);

    const getCounterText = (n) => {
        if (loading) return ""; // Handled by Skeleton
        const label = isPremiumMode ? "Pro" : "Images";
        if (n === 0) return "Add";
        if (n === 1) return `1 ${label}`;
        return `${n} ${label}`;
    };

    const handleCounterClick = () => {
        // Open Paywall on click (always allow top-up, but definitely when 'Add')
        openPaywall();
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
                <div className="star-counter" onClick={handleCounterClick} style={{ cursor: 'pointer' }}>
                    <img src="/stars.png" alt="Stars" className="star-icon-img" />
                    {loading ? (
                        <Skeleton width="60px" height="16px" borderRadius="10px" />
                    ) : (
                        <span className="counter-text">{getCounterText(credits)}</span>
                    )}
                </div>
            </div>

            {/* Right Control: Quality Switcher */}
            <div className="header-control-right">
                <QualitySwitcher />
            </div>

            {/* Center Content: Logo (Info Trigger) */}
            <div className="header-content" onClick={() => setShowInfo(true)} style={{ cursor: 'pointer' }}>
                {logo && <img src={logo} alt="Logo" className="header-logo" />}
            </div>

            {/* Paywall Modal Removed (Global) */}

            {/* Info Popup */}
            {showInfo && (
                <div className="info-popup-overlay" onClick={() => setShowInfo(false)}>
                    <div className="info-popup-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setShowInfo(false)}>
                            <CircleX size={20} />
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
