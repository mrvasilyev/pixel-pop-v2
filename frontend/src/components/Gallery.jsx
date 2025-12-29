import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import './MainScreen.css';
import { Sparkles, Lollipop } from 'lucide-react';
import headerData from '../content/header.json';
import { generateImage, uploadImage, deleteGeneration } from '../api/client';
import { useGallery } from '../hooks/useGallery';
import { useUser } from '../context/UserContext';
import PreviewModal from './PreviewModal';
import ManifestingImage from './ManifestingImage';
import Skeleton from './Skeleton';
import FadeImage from './FadeImage';
import { usePhotoAction } from '../hooks/usePhotoAction';
import { useGeneration } from '../context/GenerationContext';

const Gallery = () => {
    const queryClient = useQueryClient();

    // State for gallery images
    const [images, setImages] = useState([]);
    // Global generation state
    const { isGenerating, loadingWord, dots, previewUrl, startGeneration, stopGeneration } = useGeneration();
    const [selectedImage, setSelectedImage] = useState(null); // Preview State
    const [, setShowDebug] = useState(false); // Debug State

    // Handler for photo selection from CTA or other sources
    const handlePhotoSelected = async (file) => {
        if (!file) return;

        // 1. Show Preview immediately
        const objectUrl = URL.createObjectURL(file);
        startGeneration(objectUrl);

        try {
            // 2. Upload Image
            const imageUrl = await uploadImage(file);

            // 2.5 Calculate Aspect Ratio for Generation Size
            // NOTE: We Force 1024x1024 (Square) because 'gpt-image-1.5' likely relies on DALL-E 2 logic
            let genSize = "1024x1024";

            // 3. Generate with Special Prompt
            const result = await generateImage(
                headerData.specialPrompt,
                'header-special',
                'header-cta',
                { init_image: imageUrl, size: genSize }
            );

            // 4. Update Images
            const newImage = {
                id: result.id || Date.now(),
                src: result.image_url,
                created_at: new Date().toISOString()
            };
            setImages(prev => [newImage, ...prev]);
            localStorage.setItem('user_has_photos', 'true');

        } catch (err) {
            console.error("Generation failed:", err);

            // Safety Check Handling
            const errStr = err.toString().toLowerCase();
            if (errStr.includes("safety_check") || errStr.includes("safety system")) {
                alert("⚠️ Request Rejected: Your image contains prohibited content (violence or nudity). Please try a different photo.");
            } else {
                alert("❌ Generation Failed: " + (err.message || "Unknown error"));
            }
        } finally {
            stopGeneration();
        }
    };

    const { triggerPhotoAction, actionSheetUI } = usePhotoAction({
        onPhotoSelected: handlePhotoSelected
    });

    // Gallery 2.0: Infinite Scroll State
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGallery();

    // Initialize debug state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('debug') === '1') {
                setShowDebug(true);
            }
        }
    }, []);

    // Infinite Scroll Observer
    const observer = useRef();
    const loadMoreRef = useCallback(node => {
        if (isFetchingNextPage) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                console.log("🔄 Infinite Scroll Triggered");
                fetchNextPage();
            }
        });

        if (node) observer.current.observe(node);
    }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

    // Sync React Query data to local state AND update localStorage cache
    useEffect(() => {
        if (data) {
            const allImages = data.pages.flatMap(page => page.items);
            if (allImages.length > 0) {
                localStorage.setItem('user_has_photos', 'true');
                setImages(prev => {
                    const existingIds = new Set(prev.map(img => img.id));
                    // Check if items in data are NOT in prev. 
                    // However, if we deleted an item from prev, it IS in data (until invalidated).
                    // This logic ADDs missing items.
                    // If we just deleted ID 123 from prev, existingIds doesn't have 123.
                    // But allImages (from stale cache) HAS 123.
                    // So newItems includes 123.
                    // And it gets added back.
                    // This confirms the bug.
                    // The Fix is to ensure 'data' is updated via queryClient.setQueryData in onDelete.

                    const newItems = allImages.filter(h => !existingIds.has(h.id));

                    // Note: If we really want to respect deletions, we ideally shouldn't merge blindly.
                    // But assuming cache is updated, this is fine.
                    return [...newItems, ...prev].sort((a, b) => b.created_at?.localeCompare(a.created_at) || 0);
                });
            } else {
                // Only set to false if we have fetched and confirmed 0 items and no local generation is happening
                if (!isGenerating && images.length === 0) {
                    localStorage.setItem('user_has_photos', 'false');
                }
            }
        }
    }, [data, isGenerating, images.length]); // Dependencies include data

    // Fast Check: Use localStorage to determine if we should show skeleton
    const cachedHasPhotos = useMemo(() => localStorage.getItem('user_has_photos') === 'true', []);

    // Show loading IF: We are generating OR (We are loading AND we think user has photos)
    const showLoading = isGenerating || (isLoading && cachedHasPhotos);

    const { user, openPaywall } = useUser();

    const handleGenerate = async () => {
        if (!user || user.credits <= 0) {
            openPaywall();
            return;
        }
        triggerPhotoAction({
            title: headerData.ctaButtonText || "Try a Style",
            subtitle: "Choose a photo to get started"
        });
    };

    return (
        <div className="section-container">
            {actionSheetUI}
            <div className="section-header">My images</div>

            {(showLoading || images.length > 0) ? (
                <div className="gallery-grid">
                    {/* Loading Placeholder for Generation */}
                    {isGenerating && (
                        <div className="gallery-item loading-placeholder animate-enter">
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

                    {isLoading && !isGenerating && (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={`skeleton-${i}`} className="gallery-item" style={{ overflow: 'hidden' }}>
                                <Skeleton width="100%" height="100%" borderRadius="0" />
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
                                <FadeImage
                                    src={img.src}
                                    alt={`Gallery ${img.id}`}
                                    loading="lazy"
                                />
                            )}
                        </div>
                    ))}

                    {/* Infinite Scroll Sentinel */}
                    {hasNextPage && (
                        <div
                            ref={loadMoreRef}
                            style={{
                                gridColumn: '1 / -1',
                                height: '20px',
                                marginTop: '20px'
                            }}
                        />
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
                onDelete={async (img) => {
                    // 1. Optimistic UI Update (Local State)
                    setSelectedImage(null);
                    setImages(prev => prev.filter(i => i.id !== img.id));

                    // 2. Update React Query Cache (Prevent Re-Sync)
                    queryClient.setQueryData(['gallery'], (oldData) => {
                        if (!oldData) return oldData;
                        return {
                            ...oldData,
                            pages: oldData.pages.map(page => ({
                                ...page,
                                items: page.items.filter(i => i.id !== img.id)
                            }))
                        };
                    });

                    // 3. Backend Call
                    await deleteGeneration(img.id);

                    // 4. Invalidate to ensure consistency (optional but safe)
                    queryClient.invalidateQueries({ queryKey: ['gallery'] });
                }}
            />
        </div>
    );
};

export default Gallery;
