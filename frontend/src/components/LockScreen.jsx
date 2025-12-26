import React from 'react';

const LockScreen = ({ type = "access" }) => {
    // Common UI for both "Guest" (Browser) and "Desktop" (Responsive) locks
    // Both want the user to go to Telegram on Mobile.

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100dvh',
            background: '#0a0a0a',
            color: '#ffffff',
            flexDirection: 'column',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <img src="/logo.png" alt="Pixel Pop" style={{ width: '80px', marginBottom: '20px' }} />

            <h2 style={{ marginBottom: '10px', fontSize: '24px', fontWeight: 'bold' }}>Almost there!</h2>

            <p style={{ opacity: 0.7, marginBottom: '30px', fontSize: '16px' }}>
                Open Telegram to use Pixel Pop.
            </p>

            <div style={{
                background: '#ffffff',
                padding: '10px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://t.me/pixel_pop_bot/app"
                    alt="Scan QR Code"
                    style={{ width: '150px', height: '150px', display: 'block' }}
                />
            </div>

            {/* Optional: Deep Link for Users already on Mobile Browser */}
            <a
                href="https://t.me/pixel_pop_bot/app"
                style={{
                    marginTop: '30px',
                    color: '#3b82f6',
                    textDecoration: 'none',
                    fontSize: '14px',
                    opacity: 0.8
                }}
            >
                Open directly in Telegram
            </a>
        </div>
    );
};

export default LockScreen;
