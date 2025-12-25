import React from 'react';
import './MainScreen.css';

import { usePhotoAction } from '../hooks/usePhotoAction';
import { useGeneration } from '../context/GenerationContext';
import { useUser } from '../context/UserContext';
import { generateImage, uploadImage } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

const DiscoverStyles = () => {
    const discoverGlob = import.meta.glob('../content/discover/*.json', { eager: true });
    const discoverItems = Object.entries(discoverGlob).map(([path, mod]) => {
        const item = mod.default || mod;
        const slug = path.split('/').pop().replace('.json', '');
        return { ...item, slug };
    }).sort((a, b) => (a.order || 0) - (b.order || 0));

    const pendingItemRef = React.useRef(null);
    const queryClient = useQueryClient();
    const { startGeneration, stopGeneration } = useGeneration();
    const { user, openPaywall, isPremiumMode } = useUser();

    const handlePhotoSelected = async (file) => {
        const item = pendingItemRef.current;
        if (!item) return;

        // CHECK CREDITS based on Quality Mode
        if (isPremiumMode) {
            if (!user || (user.premium_credits || 0) < 1) {
                openPaywall();
                return;
            }
        } else {
            // Standard Mode
            if (!user || (user.credits || 0) < 1) {
                openPaywall();
                return;
            }
        }

        try {
            console.log("Processing discover item:", item.title);

            // 0. Notify UI immediately with Preview
            const previewBlobUrl = URL.createObjectURL(file);
            startGeneration(previewBlobUrl);

            const gallery = document.querySelector('.gallery-container') || document.querySelector('.section-header.my-images');
            if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });

            // 1. Upload
            const url = await uploadImage(file);
            console.log("Uploaded URL:", url);

            // 2. Start Generation
            // Discover items might just be titles/images, assume prompt is title for now
            const prompt = item.prompt || `A photo in ${item.title} style`;
            // Use item.slug for true CMS tracking
            await generateImage(prompt, item.title, item.slug || 'discover-style', {
                init_image: url,
                quality: isPremiumMode ? 'high' : 'standard'
            });

            // 3. Refresh Gallery
            await queryClient.invalidateQueries({ queryKey: ['gallery'] });

            // Only stop generation AFTER the query has refreshed the data
            stopGeneration();

        } catch (error) {
            console.error("Failed to process discover item:", error);
            alert("Failed to create image: " + error.message);
            stopGeneration();
        } finally {
            pendingItemRef.current = null;
        }
    };

    const { triggerPhotoAction, actionSheetUI } = usePhotoAction({ onPhotoSelected: handlePhotoSelected });

    const handleItemClick = (item) => {
        // Pre-check credits before opening dialog? 
        // Or wait until send? Let's check here to avoid "Action Sheet" if no credits.
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
        pendingItemRef.current = item;
        triggerPhotoAction({
            title: item.title,
            subtitle: "Choose a photo to get started"
        });
    };

    return (
        <div className="section-container">
            {actionSheetUI}
            <div className="section-header">Discover something new</div>
            <div className="discover-grid-container">
                {discoverItems.map((item, i) => (
                    <div key={i} className="discover-card" onClick={() => handleItemClick(item)}>
                        <img
                            className="discover-img"
                            src={`${import.meta.env.BASE_URL}${item.cover?.replace(/^\//, '')}` || 'https://placehold.co/48x48'}
                            alt={item.title || "Style preview"}
                            loading="lazy"
                            decoding="async"
                        />
                        <div className="discover-text">{item.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiscoverStyles;
