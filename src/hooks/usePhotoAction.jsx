import { useCallback, useRef } from 'react';

/**
 * Hook to handle photo selection via Native/Telegram UI
 * Returns:
 * - triggerPhotoAction(title): Function to open the dialog
 * - PhotoInputs: Component to render hidden inputs (must be rendered in the parent)
 */
export const usePhotoAction = (options = {}) => {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const triggerPhotoAction = useCallback((title) => {
        const webApp = window.Telegram?.WebApp;

        const fallback = () => {
            console.warn('Telegram WebApp not detected or showPopup not supported, using fallback confirm');
            // Fallback: Directly open the file picker (which usually offers Camera option on mobile)
            fileInputRef.current?.click();
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
            if (options.onPhotoSelected) {
                options.onPhotoSelected(file);
            }
            // Reset input so same file can be selected again
            e.target.value = '';
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
