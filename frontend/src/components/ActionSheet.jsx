import React, { useEffect, useState } from 'react';
import './ActionSheet.css';

const ActionSheet = ({ isOpen, onClose, onAction, title }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
        } else {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
            }, 300); // 300ms matches animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    const handleAction = (actionId) => {
        // CRITICAL: onAction must be called SYNCHRONOUSLY to satisfy mobile browser security checks for file inputs.
        // If we wait for setTimeout, the context is lost and the camera/gallery won't open on Android/iOS.
        onAction(actionId);

        setIsClosing(true);
        setTimeout(() => {
            onClose(); // Ensure parent state sync
        }, 300);
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    return (
        <div
            className={`action-sheet-overlay ${isClosing ? 'closing' : ''}`}
            onClick={handleClose}
        >
            <div className="action-sheet-container" onClick={e => e.stopPropagation()}>
                {/* Main Actions Group */}
                <div className="action-group">
                    {/* Header/Title if needed (optional, like iOS top text) */}
                    {/* Header/Title */}
                    <div style={{
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'center',
                        borderBottom: '0.5px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#888',
                            textAlign: 'center',
                        }}>
                            {title.title || title}
                        </div>
                        {title.subtitle && (
                            <div style={{
                                fontSize: '11px',
                                color: '#666',
                                textAlign: 'center',
                            }}>
                                {title.subtitle}
                            </div>
                        )}
                    </div>

                    <button className="action-button" onClick={() => handleAction('gallery')}>
                        Choose a photo
                    </button>
                    <button className="action-button" onClick={() => handleAction('camera')}>
                        Take a selfie
                    </button>
                </div>

                {/* Cancel Button Group */}
                <button className="action-button cancel" onClick={handleClose}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ActionSheet;
