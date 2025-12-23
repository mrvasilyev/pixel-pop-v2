import React from 'react';
import { X, Download, Share2 } from 'lucide-react';
import './MainScreen.css';

const PreviewModal = ({ image, onClose }) => {
    if (!image) return null;

    // Handle background click to close
    const handleOverlayClick = (e) => {
        if (e.target.className === 'preview-modal-overlay') {
            onClose();
        }
    };

    const handleDownload = () => {
        // Create temporary link to force download if possible, or open in new tab
        const link = document.createElement('a');
        link.href = image.src;
        link.download = `pixel-pop-${image.id}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="preview-modal-overlay" onClick={handleOverlayClick}>
            <button className="preview-close-btn" onClick={onClose}>
                <X size={24} />
            </button>

            <div className="preview-image-container">
                <img src={image.src} alt="Preview" className="preview-img" />

                <div className="preview-actions">
                    <button className="preview-action-btn" onClick={handleDownload}>
                        <Download size={18} />
                        Save
                    </button>
                    {/* Share functionality could go here */}
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
