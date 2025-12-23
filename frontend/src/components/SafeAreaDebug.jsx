import React, { useEffect, useState } from 'react';

export default function SafeAreaDebug() {
    const [isVisible, setIsVisible] = useState(true);
    const [values, setValues] = useState({});

    useEffect(() => {
        const updateValues = () => {
            const root = document.documentElement;
            const computed = getComputedStyle(root);

            // Get raw platform from SDK or URL
            const params = new URLSearchParams(window.location.search);
            const urlPlatform = params.get('platform');
            const sdkPlatform = window.Telegram?.WebApp?.platform || 'unknown';
            const platform = urlPlatform || sdkPlatform;

            setValues({
                // Variables from index.css / Root.jsx
                '--tg-safe-area-inset-top': computed.getPropertyValue('--tg-safe-area-inset-top'),
                '--header-offset': computed.getPropertyValue('--header-offset'),
                '--tg-content-safe-area-inset-top': computed.getPropertyValue('--tg-content-safe-area-inset-top'),
                '--safe-area-inset-bottom': computed.getPropertyValue('--safe-area-inset-bottom'),
                '--app-custom-top-spacing': computed.getPropertyValue('--app-custom-top-spacing'),
                'platform': platform,
                'width': window.innerWidth
            });
        };

        updateValues();
        const interval = setInterval(updateValues, 1000);
        return () => clearInterval(interval);
    }, []);

    const isDebug = window.location.href.includes('debug=1') || window.location.href.includes('debug=true');
    if (!import.meta.env.DEV && !isDebug) return null;

    // Platform Switching Logic
    const switchPlatform = (p) => {
        const url = new URL(window.location);
        url.searchParams.set('platform', p);
        url.searchParams.set('debug', '1'); // Keep debug on
        window.location.href = url.toString();
    };

    // Calculate Restricted Zones based on Platform (User Requirements)
    const platform = values['platform'] || 'unknown';
    const isIOS = platform === 'ios';
    const isAndroid = platform === 'android';
    const isDesktop = ['macos', 'tdesktop', 'weba', 'web'].includes(platform);

    // Top Exclusion: Mobile ~90-100px, Desktop ~20px
    // User requested specifically "100px for iOS" as an example
    let restrictedTopHeight = values['--app-custom-top-spacing'] || '0px';

    // Bottom Exclusion: Safe Area + 16px (Standard Guideline)
    // We visually represent this by adding 16px to the variable
    const restrictedBottomCalc = `calc(var(--safe-area-inset-bottom) + 16px)`;


    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                style={{
                    position: 'fixed', bottom: 5, right: 5, zIndex: 9999,
                    background: '#ff3b30', color: 'white', padding: '8px 12px',
                    borderRadius: 8, fontSize: 12, border: 'none', fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
            >
                Show Debug
            </button>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, fontFamily: 'monospace' }}>

            {/* --- RESTRICTED ZONES (HATCHED RED) --- */}

            {/* Top Restricted Zone */}
            <div style={{
                position: 'fixed', opacity: 0.9,
                top: 0, left: 0, right: 0,
                height: restrictedTopHeight,
                background: `repeating-linear-gradient(
                    45deg,
                    rgba(255, 59, 48, 0.15),
                    rgba(255, 59, 48, 0.15) 10px,
                    rgba(255, 59, 48, 0.3) 10px,
                    rgba(255, 59, 48, 0.3) 20px
                )`,
                borderBottom: '2px solid #ff3b30',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                color: '#ff3b30', fontWeight: 'bold', fontSize: 11,
                paddingBottom: 4, boxSizing: 'border-box',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                zIndex: 10000
            }}>
                <span style={{ background: 'rgba(0,0,0,0.75)', padding: '2px 8px', borderRadius: 4 }}>
                    ⛔ RESTRICTED TOP | Height: {restrictedTopHeight}
                </span>
            </div>

            {/* Bottom Restricted Zone */}
            <div style={{
                position: 'fixed', opacity: 0.9,
                bottom: 0, left: 0, right: 0,
                height: restrictedBottomCalc,
                background: `repeating-linear-gradient(
                    45deg,
                    rgba(255, 59, 48, 0.15),
                    rgba(255, 59, 48, 0.15) 10px,
                    rgba(255, 59, 48, 0.3) 10px,
                    rgba(255, 59, 48, 0.3) 20px
                )`,
                borderTop: '2px solid #ff3b30',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                color: '#ff3b30', fontWeight: 'bold', fontSize: 11,
                paddingTop: 4, boxSizing: 'border-box',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
                zIndex: 10000
            }}>
                <span style={{ background: 'rgba(0,0,0,0.75)', padding: '2px 8px', borderRadius: 4 }}>
                    ⛔ RESTRICTED BOTTOM | Start: Bottom - (SafeArea + 16px)
                </span>
            </div>

            {/* --- SAFE CONTENT AREA (Guidelines) --- */}
            {/* Outline the developer zone */}
            <div style={{
                position: 'fixed',
                top: restrictedTopHeight,
                bottom: restrictedBottomCalc,
                left: 0, right: 0,
                border: '2px dashed #32d74b',
                background: 'rgba(50, 215, 75, 0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: '#32d74b', fontSize: 12, fontWeight: 'bold',
                pointerEvents: 'none',
                gap: 4
            }}>
                <div style={{ background: 'rgba(0,0,0,0.85)', padding: '6px 10px', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    <span style={{ fontSize: 13, marginBottom: 2 }}>✅ SAFE DEV ZONE</span>
                    <span style={{ fontSize: 10, opacity: 0.9, fontWeight: 'normal', fontFamily: 'monospace' }}>
                        {values['width']}px Width <br />
                        Start Y: {restrictedTopHeight} <br />
                        End Y: Bottom - (16px + Inset)
                    </span>
                </div>
            </div>


            {/* Info Panel */}
            <div style={{
                position: 'absolute',
                top: 100,
                left: 10,
                background: 'rgba(0,0,0,0.8)',
                color: '#0f0',
                padding: 10,
                borderRadius: 8,
                fontSize: 11,
                fontFamily: 'monospace',
                pointerEvents: 'auto'
            }}>
                <div>Platform: {values['platform']}</div>
                <div>Width: {values['width']}px</div>
                <hr style={{ borderColor: '#333', margin: '4px 0' }} />
                <div>System (Notch): {values['--system-safe-area-top']}</div>
                <div>TG Safe Area: {values['env(safe-area-inset-top)']}</div>
                <div>TG Content Safe: {values['--tg-content-safe-area-inset-top']}</div>
                <div style={{ color: 'orange' }}>Header Comp: {values['--header-offset']}</div>
                <hr style={{ borderColor: '#333', margin: '4px 0' }} />
                <div style={{ color: 'red', fontWeight: 'bold' }}>FINAL TOP: {values['--safe-area-inset-top']}</div>
            </div>
            {/* --- CONTROLS & INFO --- */}
            <div style={{
                position: 'absolute', top: 280, left: 10,
                background: 'rgba(0,0,0,0.9)', color: '#fff',
                padding: 16, borderRadius: 12,
                fontSize: 11, pointerEvents: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                border: '1px solid #333',
                maxWidth: 200
            }}>
                <div style={{ marginBottom: 8, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>Platform Emulation</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                    <button onClick={() => switchPlatform('ios')} style={{
                        padding: '6px 4px', background: isIOS ? '#007aff' : '#333', border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, cursor: 'pointer'
                    }}>iOS</button>
                    <button onClick={() => switchPlatform('android')} style={{
                        padding: '6px 4px', background: isAndroid ? '#3ddc84' : '#333', border: 'none', borderRadius: 4, color: isAndroid ? '#000' : '#fff', fontSize: 10, cursor: 'pointer'
                    }}>Android</button>
                    <button onClick={() => switchPlatform('macos')} style={{
                        padding: '6px 4px', background: isDesktop ? '#999' : '#333', border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, cursor: 'pointer'
                    }}>Desktop</button>
                </div>

                <div style={{ marginBottom: 8, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>Theme Emulation</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                    <button onClick={() => {
                        const url = new URL(window.location);
                        url.searchParams.set('theme', 'light');
                        window.location.href = url.toString();
                    }} style={{
                        padding: '6px 4px', background: '#fff', border: 'none', borderRadius: 4, color: '#000', fontSize: 10, cursor: 'pointer'
                    }}>Light</button>
                    <button onClick={() => {
                        const url = new URL(window.location);
                        url.searchParams.set('theme', 'dark');
                        window.location.href = url.toString();
                    }} style={{
                        padding: '6px 4px', background: '#000', border: '1px solid #444', borderRadius: 4, color: '#fff', fontSize: 10, cursor: 'pointer'
                    }}>Dark</button>
                </div>

                <hr style={{ borderColor: '#333', margin: '10px 0' }} />

                <div style={{ opacity: 0.8 }}>Current: <span style={{ color: '#fff', fontWeight: 'bold' }}>{platform}</span></div>
                <div style={{ marginTop: 4 }}>Restricted Top: <span style={{ color: '#ff3b30' }}>{restrictedTopHeight}</span></div>

                <div style={{ marginTop: 12, fontSize: 10, color: '#666', lineHeight: 1.4 }}>
                    Red hatched areas show where NOT to place interactive elements.
                </div>
            </div>

            {/* Hide Toggle */}
            <button
                onClick={() => setIsVisible(false)}
                style={{
                    position: 'absolute', bottom: 5, right: 5, pointerEvents: 'auto',
                    background: '#333', color: 'white', padding: '6px 12px',
                    borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer'
                }}
            >
                Hide
            </button>
        </div>
    );
}
