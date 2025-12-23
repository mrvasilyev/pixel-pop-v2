import React from 'react';
import './MainScreen.css';
import { Sparkles, Lollipop } from 'lucide-react';
import headerData from '../content/header.json';
import { generateImage, uploadImage } from '../api/client';
import { useGallery } from '../hooks/useGallery';
import PreviewModal from './PreviewModal'; // New Import
import ManifestingImage from './ManifestingImage'; // New Import

import { usePhotoAction } from '../hooks/usePhotoAction';

import { useGeneration } from '../context/GenerationContext';

const Gallery = () => {
    // State for gallery images
    const [images, setImages] = React.useState([]);
    // Global generation state
    const { isGenerating, loadingWord, dots, previewUrl, startGeneration, stopGeneration } = useGeneration();
    const [selectedImage, setSelectedImage] = React.useState(null); // Preview State

    // Handler for photo selection from CTA or other sources
    const handlePhotoSelected = async (file) => {
        if (!file) return;

        // 1. Show Preview immediately
        const objectUrl = URL.createObjectURL(file);
        startGeneration(objectUrl);

        try {
            // 2. Upload Image
            const imageUrl = await uploadImage(file);

            // 3. Generate with Special Prompt
            // Use 'header-special' as style_id or a generic one if not needed by backend for this specific flow
            // Ideally we should have a styleId but header.json doesn't have one. 
            // We'll pass 'header-special' which the backend might treat as valid or ignored depending on logic.
            // Or better: Use the first style ID or a dedicated one. 
            // For now, let's use a safe default "80s-studio" or similar if we knew it.
            // But since client.js uses it in model_config, let's pass 'header-special'.
            const result = await generateImage(
                headerData.specialPrompt,
                'header-special',
                'header-cta',
                { init_image: imageUrl }
            );

            // 4. Update Images (Handled by React Query or Manual Append)
            // Ideally we invalidate query, but for instant feedback we append:
            const newImage = {
                id: Date.now(), // Temp ID
                src: result.image_url,
                created_at: new Date().toISOString()
            };
            setImages(prev => [newImage, ...prev]);

        } catch (err) {
            console.error("Generation failed:", err);
            // Ideally show error toast
        } finally {
            stopGeneration();
        }
    };

    const { triggerPhotoAction, PhotoInputs } = usePhotoAction({
        onPhotoSelected: handlePhotoSelected
    });

    // Gallery 2.0: Infinite Scroll State
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGallery();

    // Sync React Query data to local state for display (preserving curr design)
    React.useEffect(() => {
        if (data) {
            const allImages = data.pages.flatMap(page => page.items);
            if (allImages.length > 0) {
                setImages(prev => {
                    // Dedup: Prefer API items over local optimistics if needed, or simple merge
                    const existingIds = new Set(prev.map(img => img.id));
                    const newItems = allImages.filter(h => !existingIds.has(h.id));
                    // Append new items from history to the END, or prepend? 
                    // History comes newest first. 
                    // Local state 'images' might have a just-generated image at [0].
                    // To be safe: Rebuild list from history + any local pending?
                    // Simplest: Just use history. 
                    // BUT, handleGenerate adds to prev.
                    // Better: Let history take over, but if we just generated, it might be in history already if we invalidated query.
                    // For now: Merging logic.
                    // Ensure backend items are sorted visually if needed, but array order from backend is usually correct
                    return [...newItems, ...prev].sort((a, b) => b.created_at?.localeCompare(a.created_at) || 0);
                });
            }
        }
    }, [data]);

    // Helper to scroll to styles
    const scrollToStyles = () => {
        const stylesSection = document.querySelector('.h-scroll-list');
        if (stylesSection) stylesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Updated CTA Handler
    const handleGenerate = async () => {
        triggerPhotoAction(headerData.ctaButtonText || "Try a Style");
    };

    return (
        <div className="section-container">
            <PhotoInputs />
            <div className="section-header">My images</div>

            {(isLoading || images.length > 0 || isGenerating) ? (
                <div className="gallery-grid">
                    {/* Loading Placeholder for Generation */}
                    {isGenerating && (
                        <div className="gallery-item loading-placeholder animate-enter">
                            {/* Preview Background */}
                            {previewUrl && (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        filter: 'blur(4px) brightness(0.7)'
                                    }}
                                />
                            )}

                            <div className="loading-blur" style={previewUrl ? { backdropFilter: 'none', background: 'transparent' } : {}}>
                                <Lollipop size={48} color="#ffffff" className="lollipop-spinner" />
                                <div className="loading-text-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="loading-text">{loadingWord}</span>
                                    <span style={{ position: 'absolute', left: '100%', marginLeft: '2px', width: '24px', textAlign: 'left' }} className="loading-text">
                                        {dots}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Initial Loading State for Gallery (Skeleton-like or just Spinner) */}
                    {isLoading && !isGenerating && (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={`skeleton-${i}`} className="gallery-item loading-placeholder" style={{ opacity: 0.5 }}>
                                <div className="loading-blur" />
                            </div>
                        ))
                    )}

                    {/* Render Images */}
                    {images.map((img, index) => (
                        <div key={img.id} className="gallery-item" onClick={() => setSelectedImage(img)}>
                            {index === 0 && previewUrl ? (
                                <ManifestingImage
                                    src={img.src}
                                    previewUrl={previewUrl}
                                    alt={`Gallery ${img.id}`}
                                    className="manifest-img"
                                />
                            ) : (
                                <img src={img.src} alt={`Gallery ${img.id}`} loading="lazy" />
                            )}
                        </div>
                    ))}

                    {/* Load More Button (Infinite Scroll Trigger) */}
                    {hasNextPage && (
                        <div className="gallery-load-more" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                            <button
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="cta-button"
                                style={{ fontSize: '14px', padding: '8px 16px' }}
                            >
                                {isFetchingNextPage ? 'Loading more...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="gallery-empty-state">
                    <div className="empty-icon-bg">
                        <Lollipop size={48} color="#ffffff" className="lollipop-spinner" />
                    </div>
                    <h3>Start your journey</h3>
                    <p>Create your first masterpiece using our AI styles</p>
                    <button className="cta-button" onClick={handleGenerate}>
                        {headerData.ctaButtonText || "Try a Style"}
                    </button>
                </div>
            )}

            {/* Preview Modal */}
            <PreviewModal
                image={selectedImage}
                onClose={() => setSelectedImage(null)}
            />
        </div>
    );
};

export default Gallery;
