
import React from 'react';
import './MainScreen.css';

import { usePhotoAction } from '../hooks/usePhotoAction';
import { generateImage, uploadImage } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

const DiscoverStyles = () => {
    const discoverGlob = import.meta.glob('../content/discover/*.json', { eager: true });
    const discoverItems = Object.values(discoverGlob).map(mod => mod.default || mod).sort((a, b) => (a.order || 0) - (b.order || 0));

    const pendingItemRef = React.useRef(null);
    const queryClient = useQueryClient();

    const handlePhotoSelected = async (file) => {
        const item = pendingItemRef.current;
        if (!item) return;
        try {
            const url = await uploadImage(file);
            // Discover items might just be titles/images, assume prompt is title for now
            const prompt = `A photo in ${item.title} style`;
            await generateImage(prompt, item.title, 'discover-style', { init_image: url });

            queryClient.invalidateQueries({ queryKey: ['gallery'] });

            const gallery = document.querySelector('.gallery-container');
            if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error("Failed to process discover item:", error);
        } finally {
            pendingItemRef.current = null;
        }
    };

    const { triggerPhotoAction, PhotoInputs } = usePhotoAction({ onPhotoSelected: handlePhotoSelected });

    const handleItemClick = (item) => {
        pendingItemRef.current = item;
        triggerPhotoAction(item.title);
    };

    return (
        <div className="section-container">
            <PhotoInputs />
            <div className="section-header">Discover something new</div>
            <div className="discover-grid-container">
                {discoverItems.map((item, i) => (
                    <div key={i} className="discover-card" onClick={() => handleItemClick(item)}>
                        <img className="discover-img" src={item.cover || 'https://placehold.co/48x48'} alt="icon" />
                        <div className="discover-text">{item.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiscoverStyles;
