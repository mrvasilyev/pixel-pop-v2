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
        setIsClosing(true);
        setTimeout(() => {
            onAction(actionId);
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
                    {title && (
                        <div style={{
                            padding: '12px',
                            fontSize: '13px',
                            color: '#888',
                            textAlign: 'center',
                            borderBottom: '0.5px solid rgba(255,255,255,0.1)'
                        }}>
                            {title}
                        </div>
                    )}

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
