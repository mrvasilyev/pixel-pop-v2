import ActionSheet from '../components/ActionSheet';
import React, { useState, useRef, useCallback } from 'react';

/**
 * Hook to handle photo selection via Custom Telegram-style Action Sheet (2025 UI)
 * Returns:
 * - triggerPhotoAction(title): Function to open the Action Sheet
 * - PhotoInputs: Component to render hidden inputs AND the Action Sheet (must be rendered in the parent)
 */
export const usePhotoAction = (options = {}) => {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetTitle, setSheetTitle] = useState('');

    const triggerPhotoAction = useCallback((title) => {
        setSheetTitle(title || 'Choose a photo to get started');
        setIsSheetOpen(true);
    }, []);

    const handleAction = (actionId) => {
        if (actionId === 'gallery') {
            fileInputRef.current?.click();
        } else if (actionId === 'camera') {
            cameraInputRef.current?.click();
        }
    };

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
            <ActionSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onAction={handleAction}
                title={sheetTitle}
            />
        </>
    );

    return { triggerPhotoAction, PhotoInputs };
};
