import React from 'react';
import { Smartphone, Lock } from 'lucide-react';

const LockScreen = ({ type = "access" }) => {
    const isDesktop = type === "desktop";

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0f0f0f',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                padding: '3rem',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                maxWidth: '400px',
                border: '1px solid #333'
            }}>
                {isDesktop ? (
                    <Smartphone size={64} color="#3b82f6" />
                ) : (
                    <Lock size={64} color="#ef4444" />
                )}

                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                    {isDesktop ? "Please Use Mobile" : "Access Restricted"}
                </h2>

                <p style={{ margin: 0, color: '#9ca3af', lineHeight: 1.5 }}>
                    {isDesktop
                        ? "Pixel Pop is designed for the best experience on your phone. Please open this Mini App on your mobile device."
                        : "This application can only be accessed via the Telegram Bot."}
                </p>

                {!isDesktop && (
                    <a
                        href="https://t.me/mro_flug_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            marginTop: '1rem',
                            padding: '12px 24px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: 500
                        }}
                    >
                        Open in Telegram
                    </a>
                )}
            </div>
        </div>
    );
};

export default LockScreen;
