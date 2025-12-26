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
        link.download = `pixel-pop-${image.id || 'image'}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        if (navigator.share && image) {
            try {
                // Determine file type from src or default to png
                // Ideally we'd have a Blob, but sharing the URL is easier if it's external, 
                // or we can try to share the file object if we had it.
                // For now, share the text/url.
                await navigator.share({
                    title: 'Pixel Pop Creation',
                    text: 'Check out this image I created with Pixel Pop!',
                    url: image.src
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback: Copy URL
            navigator.clipboard.writeText(image.src);
            alert('Image URL copied to clipboard!');
        }
    };

    return (
        <div className="preview-modal-overlay" onClick={handleOverlayClick}>
            {/* Header Layer - Absolute Top */}
            <div className="preview-header">
                <button className="preview-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="preview-header-right">
                    {/* Info Button - styled as circle */}
                    {/* <button className="preview-icon-btn"><Info size={20} /></button> */}

                    <button className="preview-pill-btn variant-dark" onClick={handleDownload}>
                        Save
                    </button>
                    <button className="preview-pill-btn variant-light" onClick={handleShare}>
                        Share
                    </button>
                </div>
            </div>

            <div className="preview-image-container">
                <img src={image.src} alt="Preview" className="preview-img" />
            </div>
        </div>
    );
};

export default PreviewModal;
