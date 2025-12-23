import React from 'react';

const SplashScreen = ({ visible }) => {
    if (!visible) return null;

    return (
        <div className="splash-screen">
            <div className="splash-content">
                <img src="/LOLLY_D.svg" alt="Loading..." className="splash-spinner" />
                <div className="splash-text">Loading Pixel Pop...</div>
            </div>

            <style jsx>{`
                .splash-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: var(--background, #000); 
                    /* Use app background color */
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    transition: opacity 0.5s ease-out;
                }
                
                .splash-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }

                .splash-spinner {
                    width: 120px;
                    height: 120px;
                    animation: spin 3s linear infinite;
                }

                .splash-text {
                    color: white;
                    font-family: 'Inter', sans-serif;
                    font-size: 1.2rem;
                    opacity: 0.8;
                    animation: pulse 1.5s ease-in-out infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
