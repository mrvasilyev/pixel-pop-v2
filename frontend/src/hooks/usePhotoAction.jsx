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
        // Direct action: Open the native file picker
        // This usually offers "Photo Library", "Take Photo", and "Choose File" on mobile natively
        fileInputRef.current?.click();
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
