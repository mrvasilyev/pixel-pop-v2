import React from 'react';
import './MainScreen.css';

import { usePhotoAction } from '../hooks/usePhotoAction';
import { useGeneration } from '../context/GenerationContext';
import { useUser } from '../context/UserContext';
import { generateImage, uploadImage } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

export default function TopStyles() {
    const stylesGlob = import.meta.glob('../content/styles/*.json', { eager: true });
    const styles = Object.entries(stylesGlob).map(([path, mod]) => {
        const item = mod.default || mod;
        const slug = path.split('/').pop().replace('.json', '');
        return { ...item, slug };
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    const pendingStyleRef = React.useRef(null);
    const queryClient = useQueryClient();
    const { startGeneration, stopGeneration } = useGeneration();

    // Handler for when user selects/takes a photo
    const handlePhotoSelected = async (file) => {
        const style = pendingStyleRef.current;
        if (!style) return;

        try {
            console.log("Uploading photo for style:", style.title);

            // 0. Notify UI immediately with Preview
            const previewBlobUrl = URL.createObjectURL(file);
            startGeneration(previewBlobUrl);

            const gallery = document.querySelector('.gallery-container') || document.querySelector('.section-header'); // Fallback
            if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });

            // 1. Upload
            const url = await uploadImage(file);
            console.log("Uploaded URL:", url);

            // 2. Start Generation
            // Use the style's prompt + init_image
            const prompt = style.prompt || `A photo in ${style.title} style`;
            await generateImage(prompt, style.title, style.slug || 'style-transfer', {
                init_image: url,
                quality: isPremiumMode ? 'high' : 'standard'
            });

            // 3. Refresh Gallery
            await queryClient.invalidateQueries({ queryKey: ['gallery'] });

            // Only stop generation AFTER the query has refreshed the data
            stopGeneration();

        } catch (error) {
            console.error("Failed to start style transfer:", error);
            alert("Failed to create image: " + error.message);
            stopGeneration(); // Stop on error too
        } finally {
            pendingStyleRef.current = null;
        }
    };

    const { triggerPhotoAction, actionSheetUI } = usePhotoAction({ onPhotoSelected: handlePhotoSelected });
    const { user, openPaywall, isPremiumMode } = useUser();

    const handleStyleClick = (style) => {
        if (isPremiumMode) {
            if (!user || (user.premium_credits || 0) < 1) {
                openPaywall();
                return;
            }
        } else {
            if (!user || (user.credits || 0) < 1) {
                openPaywall();
                return;
            }
        }
        pendingStyleRef.current = style;
        triggerPhotoAction(style.title);
    };

    return (
        <div className="section-container">
            {actionSheetUI}
            <div className="section-header">Try a style on an image</div>
            <div className="h-scroll-list">
                {styles.map((style, i) => (
                    <div key={i} className="top-style-card" onClick={() => handleStyleClick(style)}>
                        <div
                            className="top-style-img"
                            style={style.cover ? { backgroundImage: `url(${style.cover})`, backgroundSize: 'cover' } : { backgroundColor: '#333' }}
                        />
                        <div className="top-style-title">{style.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
