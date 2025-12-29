import { X, Download, Share2, Trash2 } from 'lucide-react';
import './MainScreen.css';

const PreviewModal = ({ image, onClose, onDelete }) => {
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
            </div>
        </div>
    );
};

export default PreviewModal;
