import { useCallback, useRef } from 'react';

/**
 * Hook to handle photo selection via Native/Telegram UI
 * Returns:
 * - triggerPhotoAction(title): Function to open the dialog
 * - PhotoInputs: Component to render hidden inputs (must be rendered in the parent)
 */
export const usePhotoAction = () => {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const triggerPhotoAction = useCallback((title) => {
        const webApp = window.Telegram?.WebApp;

        const fallback = () => {
            console.warn('Telegram WebApp not detected or showPopup not supported, using fallback confirm');
            // Simple fallback: just open file picker directly since we can't do a nice 3-button dialog
            // A standard confirm is "OK/Cancel", so we map OK -> Gallery, Cancel -> Camera? It's confusing.
            // Better to just asking "Take a photo?" -> OK=Camera, Cancel=Gallery?
            // Let's stick to "Gallery" as primary action if we can't ask.
            // Or use a simple confirm "Use Camera? (Cancel for Gallery)"
            const useCamera = window.confirm(`${title}\n\nDo you want to take a new selfie?\n\nOK = Camera\nCancel = Gallery`);
            if (useCamera) {
                cameraInputRef.current?.click();
            } else {
                fileInputRef.current?.click();
            }
        };

        if (webApp && webApp.showPopup && typeof webApp.isVersionAtLeast === 'function' && webApp.isVersionAtLeast('6.2')) {
            try {
                webApp.showPopup({
                    title: title || 'Choose Action',
                    message: 'Choose a photo to get started.',
                    buttons: [
                        { id: 'gallery', type: 'default', text: 'Choose a photo' },
                        { id: 'camera', type: 'default', text: 'Take a selfie' },
                        { id: 'cancel', type: 'cancel' }
                    ]
                }, (buttonId) => {
                    if (buttonId === 'gallery') {
                        fileInputRef.current?.click();
                    } else if (buttonId === 'camera') {
                        cameraInputRef.current?.click();
                    }
                });
            } catch (e) {
                console.error("WebApp.showPopup failed:", e);
                fallback();
            }
        } else {
            fallback();
        }
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log("File selected:", file);
            // TODO: Handle the file (upload, preview, etc.)
            // The user request didn't specify what to do WITH the file, just to open the dialog.
            // For now we just log it. 
        }
    };

    const PhotoInputs = () => (
        <>
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </>
    );

    return { triggerPhotoAction, PhotoInputs };
};
