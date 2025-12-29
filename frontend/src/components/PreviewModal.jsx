import { X, Download, Share2, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import './MainScreen.css';

const PreviewModal = ({ image, onClose, onDelete, onFeedback }) => {
    if (!image) return null;

    // Handle background click to close
    const handleOverlayClick = (e) => {
        if (e.target.className === 'preview-modal-overlay') {
            onClose();
        }
    };

    const handleDownload = () => {
        const fileName = `pixel-pop-${image.id || 'image'}.png`;

        // Check if Telegram WebApp downloadFile is available (Bot API 8.0+)
        if (window.Telegram?.WebApp?.downloadFile) {
            window.Telegram.WebApp.downloadFile({
                url: image.src,
                file_name: fileName
            });
        } else {
            // Legacy Fallback
            const link = document.createElement('a');
            link.href = image.src;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
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

    const handleDelete = () => {
        const tg = window.Telegram?.WebApp;

        // showConfirm requires Bot API 6.2+
        if (tg && tg.showConfirm && tg.isVersionAtLeast && tg.isVersionAtLeast('6.2')) {
            try {
                tg.showConfirm("Delete this image?", (confirmed) => {
                    if (confirmed) {
                        if (onDelete) onDelete(image);
                        else onClose();
                    }
                });
            } catch (e) {
                // Should not happen with version check, but extra safety
                if (window.confirm('Delete this image?')) {
                    if (onDelete) onDelete(image);
                    else onClose();
                }
            }
        } else {
            // Fallback for Local Dev, Web, or older Telegram versions (< 6.2)
            if (window.confirm('Are you sure you want to delete this image?')) {
                if (onDelete) onDelete(image);
                else onClose();
            }
        }
    };

    const handleFeedback = async (type) => {
        // Optimistic UI could be handled by parent, but for now just local effect if we had local state
        // For now, trigger callback or API
        try {
            if (onFeedback) onFeedback(image, type);

            // Native Telegram Alert
            if (window.Telegram?.WebApp?.showAlert) {
                window.Telegram.WebApp.showAlert("Thanks for your feedback!");
            }
        } catch (e) {
            console.error("Feedback error", e);
        }
    };

    const platform = window.Telegram?.WebApp?.platform || 'unknown';

    return (
        <div className="preview-modal-overlay" onClick={handleOverlayClick} data-platform={platform}>
            {/* Header Layer - Absolute Top */}
            <div className="preview-header">
                <button className="preview-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="preview-header-right">
                    {/* Delete Button */}
                    <button className="preview-close-btn" onClick={handleDelete}>
                        <Trash2 size={24} />
                    </button>

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

                {/* Feedback Controls - Right Aligned Under Photo */}
                {/* Feedback Controls - Right Aligned Under Photo */}
                <div className="feedback-controls" style={{
                    width: '100%',
                    maxWidth: '80vh',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    marginTop: '12px',
                    paddingRight: '4px'
                }}>
                    <button
                        onClick={() => handleFeedback('thumbs_up')}
                        style={{
                            background: image.feedback === 'thumbs_up' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                            border: image.feedback === 'thumbs_up' ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            color: 'white'
                        }}
                    >
                        <ThumbsUp size={20} strokeWidth={2} />
                    </button>

                    <button
                        onClick={() => handleFeedback('thumbs_down')}
                        style={{
                            background: image.feedback === 'thumbs_down' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                            border: image.feedback === 'thumbs_down' ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            color: 'white'
                        }}
                    >
                        <ThumbsDown size={20} strokeWidth={2} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
