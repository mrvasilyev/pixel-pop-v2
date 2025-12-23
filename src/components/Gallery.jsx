import React from 'react';
import './MainScreen.css';
import { Sparkles, Lollipop } from 'lucide-react';
import headerData from '../content/header.json';
import { generateImage } from '../api/client';

import { usePhotoAction } from '../hooks/usePhotoAction';

const Gallery = () => {
    // State for gallery images and loading status
    const [images, setImages] = React.useState([]);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [loadingWord, setLoadingWord] = React.useState("Loading");
    const [dots, setDots] = React.useState("");
    const { triggerPhotoAction, PhotoInputs } = usePhotoAction();

    // Effect to cycle words and animate dots
    React.useEffect(() => {
        if (!isGenerating) return;

        // 1. Pick random word initially and cycle every 3s
        const phrases = headerData.loadingPhrases || ["Loading"];
        // Pick random start
        let wordIndex = Math.floor(Math.random() * phrases.length);
        setLoadingWord(phrases[wordIndex]);

        const wordInterval = setInterval(() => {
            wordIndex = (wordIndex + 1) % phrases.length;
            setLoadingWord(phrases[wordIndex]);
        }, 3000);

        // 2. Animate dots every 500ms
        let dotCount = 0;
        const dotInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4; // 0, 1, 2, 3
            setDots(".".repeat(dotCount));
        }, 500);

        return () => {
            clearInterval(wordInterval);
            clearInterval(dotInterval);
        };
    }, [isGenerating]);

    // Helper to scroll to styles
    const scrollToStyles = () => {
        const stylesSection = document.querySelector('.h-scroll-list');
        if (stylesSection) stylesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleGenerate = async () => {
        if (!headerData.specialPrompt) {
            // Fallback to scrolling if no special prompt
            scrollToStyles();
            return;
        }

        console.log("Triggering generation with special prompt:", headerData.specialPrompt);

        // Use View Transition API if available for smooth layout morph
        if (document.startViewTransition) {
            document.startViewTransition(() => setIsGenerating(true));
        } else {
            setIsGenerating(true);
        }

        try {
            const data = await generateImage(headerData.specialPrompt, 'style-1');
            console.log("Generation request sent successfully", data);

            if (data.image_url) {
                // Add the new image to the start of the list
                setImages(prev => [{
                    id: Date.now(),
                    src: data.image_url
                }, ...prev]);
            }
        } catch (error) {
            console.error("Failed to generate image:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="section-container">
            <PhotoInputs />
            <div className="section-header">My images</div>

            {images.length > 0 || isGenerating ? (
                <div className="gallery-grid">
                    {/* Loading Placeholder */}
                    {isGenerating && (
                        <div className="gallery-item loading-placeholder animate-enter">
                            <div className="loading-blur">
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

                    {/* Render Images */}
                    {images.map((img) => (
                        <div key={img.id} className="gallery-item" onClick={() => triggerPhotoAction('Gallery Image')}>
                            <img src={img.src} alt={`Gallery ${img.id}`} />
                        </div>
                    ))}
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
        </div>
    );
};

export default Gallery;
