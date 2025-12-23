import { miniApp, themeParams, viewport, swipeBehavior, init, mockTelegramEnv } from '@telegram-apps/sdk-react';
import { useState, useEffect, useRef } from 'react';
import App from '../App.jsx';
import SafeAreaDebug from './SafeAreaDebug.jsx';
import { Component } from 'react';

// Error Boundary for safety
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: 'red', background: '#000' }}>
                    <h2>Something went wrong.</h2>
                    <pre>{this.state.error?.toString()}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

// Wrapper to handle debug mode
const SafeDebugWrapper = () => {
    const [showDebug, setShowDebug] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setShowDebug(params.get('debug') === '1');
        }
    }, []);

    if (!showDebug) return null;
    return <SafeAreaDebug />;
};

function AppInitializer() {
    const [isSDKReady, setSDKReady] = useState(false);
    const [initError, setInitError] = useState(null);
    const isInitStarted = useRef(false);

    useEffect(() => {
        if (isInitStarted.current) return;
        isInitStarted.current = true;

        const initSDK = async () => {
            try {
                // 1. Prepare Environment (Mock if needed)
                const params = new URLSearchParams(window.location.search);
                const forcePlatform = params.get('platform');
                const isDebug = params.get('debug') === '1';
                const shouldMock = forcePlatform || isDebug || !window.Telegram?.WebApp?.initData;

                if (shouldMock) {
                    const platform = forcePlatform || 'unknown';

                    // Mock Safe Areas if debug is on OR if a platform is forced (for visual testing)
                    if (isDebug || forcePlatform) {
                        const MOCK_SAFE_AREAS = {
                            ios: { top: 47, bottom: 34, left: 0, right: 0 },
                            android: { top: 24, bottom: 0, left: 0, right: 0 },
                            macos: { top: 10, bottom: 0, left: 0, right: 0 }, // Desktop usually 0, but setting small for debug visibility
                            unknown: { top: 0, bottom: 0, left: 0, right: 0 }
                        };

                        const safeArea = MOCK_SAFE_AREAS[platform] || MOCK_SAFE_AREAS.unknown;

                        // Inject into window.Telegram.WebApp BEFORE init/mock
                        try {
                            window.Telegram = window.Telegram || {};
                            window.Telegram.WebApp = window.Telegram.WebApp || {};

                            // Attempt to write mock values. 
                            // NOTE: When using the official telegram-web-app.js script, these are read-only getters.
                            // We wrap in try-catch to prevent crashing.
                            Object.defineProperty(window.Telegram.WebApp, 'safeAreaInset', {
                                value: safeArea,
                                writable: true, configurable: true // Try to force it if possible
                            });

                            // Fallback to direct assignment if defineProperty works or throws specific error logic
                            // But actually, simpler to just attempt assignment and catch error.
                            // The previous error was a TypeError on assignment.
                            // Let's just try-catch the whole block of assignments.
                        } catch (e) {
                            // Ignore getter errors
                        }

                        try {
                            window.Telegram.WebApp.safeAreaInset = safeArea;
                            window.Telegram.WebApp.platform = platform; // Force platform on legacy obj too

                            // Mock content safe area typically includes the header
                            const headerHeight = platform === 'ios' ? 44 : (platform === 'android' ? 56 : 0);
                            window.Telegram.WebApp.contentSafeAreaInset = {
                                ...safeArea,
                                top: safeArea.top + headerHeight
                            };
                        } catch (writeErr) {
                            // Expected behavior when official script is loaded (read-only properties).
                            // We continue using the React SDK's internal state (mockTelegramEnv).
                        }
                    }

                    const mockParams = {
                        tgWebAppVersion: '7.0',
                        tgWebAppThemeParams: {},
                        tgWebAppPlatform: platform,
                        tgWebAppData: '',
                    };

                    // Theme Mocking
                    const themeParam = params.get('theme');
                    const isDark = themeParam === 'dark';
                    // Default to light if not specified, or respect param

                    if (themeParam) {
                        mockParams.tgWebAppThemeParams = isDark
                            ? { bg_color: '#000000', text_color: '#ffffff', hint_color: '#7d7d7d', button_color: '#2ea6ff', button_text_color: '#ffffff', secondary_bg_color: '#1c1c1d' }
                            : { bg_color: '#ffffff', text_color: '#000000', hint_color: '#999999', button_color: '#2481cc', button_text_color: '#ffffff', secondary_bg_color: '#f0f0f0' };
                    }

                    try {
                        mockTelegramEnv({ launchParams: mockParams });
                        console.log(`Mock environment set for ${platform}`);
                    } catch (mockErr) {
                        console.warn("Mocking warning:", mockErr);
                    }
                }

                // 2. Init SDK
                try {
                    init();
                } catch (e) {
                    console.warn("SDK Init warning:", e);
                }

                // 3. Mount Components securely with Timeout
                const safeMount = async (component, name) => {
                    if (component.mount && !component.isMounted()) {
                        try {
                            await Promise.race([
                                component.mount(),
                                new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout mounting ${name}`)), 2000))
                            ]);
                            return true;
                        } catch (e) {
                            console.warn(`Mount failed/skipped for ${name}:`, e);
                            return false;
                        }
                    }
                    return true;
                };

                await safeMount(miniApp, 'miniApp');
                const themeMounted = await safeMount(themeParams, 'themeParams');
                if (viewport) {
                    const viewportMounted = await safeMount(viewport, 'viewport');
                    if (viewportMounted) {
                        try {
                            if (viewport.expand) viewport.expand();
                            if (viewport.bindCssVars) viewport.bindCssVars();
                        } catch (e) { console.warn("Viewport expand/bind error", e); }
                    }
                    if (viewportMounted) {
                        try {
                            if (viewport.expand) viewport.expand();
                            if (viewport.bindCssVars) viewport.bindCssVars();
                        } catch (e) { console.warn("Viewport expand/bind error", e); }
                    }
                }

                // 3.1 Swipe Behavior (Disable Vertical Swipe for Mini App)
                const swipeMounted = await safeMount(swipeBehavior, 'swipeBehavior');
                if (swipeMounted) {
                    try {
                        if (swipeBehavior.disableVerticalSwipe) {
                            swipeBehavior.disableVerticalSwipe();
                            console.log("Vertical swipes disabled via SDK");
                        }
                    } catch (e) { console.warn("Swipe behavior error", e); }
                }

                // 4. Bind CSS Variables (Theme Params)
                if (themeParams.bindCssVars) {
                    if (themeMounted) {
                        try { themeParams.bindCssVars(); } catch (e) { }
                    }
                }

                // 5. Signal Ready
                if (miniApp.ready) miniApp.ready();

                setSDKReady(true);
            } catch (err) {
                console.error("SDK Initialization Error:", err);
                setInitError(err);
                setSDKReady(true); // Always unblock
            }
        };

        // Safety timeout to prevent infinite loading (Fallback)
        const safetyTimer = setTimeout(() => {
            console.warn("SDK Loading safety timer triggered.");
            setSDKReady(true);
        }, 1500);

        initSDK().then(() => {
            clearTimeout(safetyTimer); // Clear valid timer if init finished fast
        });

        return () => clearTimeout(safetyTimer);
    }, []);

    // Robust Viewport Sync Logic
    useEffect(() => {
        if (!isSDKReady || !viewport) return;

        const syncViewport = () => {
            const root = document.documentElement;

            // Raw Insets from SDK or Native Object
            const contentInsets = viewport.contentSafeAreaInsets || window.Telegram?.WebApp?.contentSafeAreaInset || {};
            const safeInsets = viewport.safeAreaInsets || window.Telegram?.WebApp?.safeAreaInset || {};

            // Heuristic for Header Compensation
            const platform = (viewport.platform || '').toLowerCase();
            const isMobile = ['ios', 'android', 'ios_app', 'android_app'].includes(platform);

            let headerComp = 0;
            // If on mobile and content inset top is suspiciously small (close to safe area), assume header exists but isn't reported
            let cTop = contentInsets.top || 0;
            let sTop = safeInsets.top || 0;
            if (isMobile && cTop < (sTop + 20)) {
                headerComp = 44; // Standard Telegram Header Height
            }

            // Set CSS Variables
            root.style.setProperty('--tg-header-height-compensation', `${headerComp}px`);

            // MOCK DATA CALCULATION (Robust Fallback)
            const params = new URLSearchParams(window.location.search);
            const isDebug = params.get('debug') === '1';
            const mockPlatform = params.get('platform') || 'unknown';

            let mockSafe = { top: 0, bottom: 0, left: 0, right: 0 };
            let mockContent = { top: 0, bottom: 0, left: 0, right: 0 };

            if (isDebug || (mockPlatform && mockPlatform !== 'unknown')) {
                const MOCK_SAFE_AREAS = {
                    ios: { top: 47, bottom: 34, left: 0, right: 0 },
                    android: { top: 24, bottom: 0, left: 0, right: 0 },
                    macos: { top: 10, bottom: 0, left: 0, right: 0 },
                    unknown: { top: 0, bottom: 0, left: 0, right: 0 }
                };
                mockSafe = MOCK_SAFE_AREAS[mockPlatform] || MOCK_SAFE_AREAS.unknown;

                const headerH = mockPlatform === 'ios' ? 44 : (mockPlatform === 'android' ? 56 : 0);
                mockContent = { ...mockSafe, top: mockSafe.top + headerH };
            }

            // --- Custom Top Spacing Logic (Promoted from SafeAreaDebug) ---
            // Calculate Restricted Zones based on Platform
            const isIOS = platform === 'ios';
            const isAndroid = platform === 'android';
            const isDesktop = ['macos', 'tdesktop', 'weba', 'web'].includes(platform);

            let restrictedTopHeight = '90px'; // Default mobile fallback
            if (isIOS) restrictedTopHeight = '100px';
            else if (isAndroid) restrictedTopHeight = '90px';
            else if (isDesktop) restrictedTopHeight = '20px';

            root.style.setProperty('--app-custom-top-spacing', restrictedTopHeight);
            // -------------------------------------------------------------

            // Safe Area Insets (Native)
            // Prioritize SDK -> Window -> Calculated Mock
            sTop = (safeInsets.top || 0) || (window.Telegram?.WebApp?.safeAreaInset?.top || 0) || mockSafe.top;
            const sBottom = (safeInsets.bottom || 0) || (window.Telegram?.WebApp?.safeAreaInset?.bottom || 0) || mockSafe.bottom;

            root.style.setProperty('--tg-safe-area-inset-top', `${sTop}px`);
            root.style.setProperty('--tg-safe-area-inset-bottom', `${sBottom}px`);
            root.style.setProperty('--tg-safe-area-inset-left', `${safeInsets.left || 0}px`);
            root.style.setProperty('--tg-safe-area-inset-right', `${safeInsets.right || 0}px`);

            // Content Insets (SDK)
            // Prioritize SDK -> Window -> Calculated Mock
            cTop = (contentInsets.top || 0) || (window.Telegram?.WebApp?.contentSafeAreaInset?.top || 0) || mockContent.top;
            const cBottom = (contentInsets.bottom || 0) || (window.Telegram?.WebApp?.contentSafeAreaInset?.bottom || 0) || mockContent.bottom;

            root.style.setProperty('--tg-content-safe-area-inset-top', `${cTop}px`);
            root.style.setProperty('--tg-content-safe-area-inset-bottom', `${cBottom}px`);


            // Viewport Height
            const vHeight = (typeof viewport.height === 'function' ? viewport.height() : viewport.height)
                || window.Telegram?.WebApp?.viewportStableHeight
                || window.innerHeight;

            if (vHeight) {
                root.style.setProperty('--tg-viewport-stable-height', `${vHeight}px`);
            }
        };

        // Sync immediately and on change
        syncViewport();
        const unsubscribe = viewport.on && viewport.on('change', syncViewport);
        window.addEventListener('resize', syncViewport);

        return () => {
            if (unsubscribe) unsubscribe();
            window.removeEventListener('resize', syncViewport);
        };
    }, [isSDKReady]);

    // Scroll Behavior Hacks (Prevent Collapse & Ensure Scroll)
    useEffect(() => {
        // 1. Ensure Document is Scrollable (1px overflow) to capture swipes
        // Fixes: "Swiping down at the top collapses the mini app"
        const ensureScrollable = () => {
            const hasScroll = document.documentElement.scrollHeight > window.innerHeight;
            if (!hasScroll) {
                document.documentElement.style.setProperty('height', 'calc(100vh + 1px)', 'important');
            }
        };

        // 2. Prevent Collapse on scrollY === 0
        // Fixes: "Telegram interpreting a downward swipe at scrollY === 0 as a collapse gesture"
        const preventCollapse = (e) => {
            const scrollableEl = document.querySelector('.main-screen');
            if (scrollableEl && scrollableEl.scrollTop === 0) {
                scrollableEl.scrollTop = 1;
            }
        };

        window.addEventListener('load', ensureScrollable);
        window.addEventListener('resize', ensureScrollable); // Re-check on resize

        // Attach to the scrolling container, not window (since we lock body)
        const scrollContainer = document.querySelector('.main-screen');
        if (scrollContainer) {
            scrollContainer.addEventListener('touchstart', preventCollapse, { passive: true });
        }

        ensureScrollable(); // Initial check

        return () => {
            window.removeEventListener('load', ensureScrollable);
            window.removeEventListener('resize', ensureScrollable);
            if (scrollContainer) {
                scrollContainer.removeEventListener('touchstart', preventCollapse);
            }
        };
    }, []);

    if (initError) {
        return <div style={{ padding: 20, color: 'red' }}>Failed to initialize Telegram SDK.</div>;
    }

    if (!isSDKReady) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000', color: '#fff' }}>Loading...</div>;
    }

    return (
        <ErrorBoundary>
            <SafeDebugWrapper />
            <App />
        </ErrorBoundary>
    );
}

import { GenerationProvider } from '../context/GenerationContext';

export default function Root() {
    return (
        <GenerationProvider>
            <AppInitializer />
        </GenerationProvider>
    );
}
