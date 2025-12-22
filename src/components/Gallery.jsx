import React from 'react';
import './MainScreen.css';
import { Sparkles, Lollipop } from 'lucide-react';
import headerData from '../content/header.json';
import { generateImage } from '../api/client';

const Gallery = () => {
    // State for gallery images and loading status
    const [images, setImages] = React.useState([]);
    const [isGenerating, setIsGenerating] = React.useState(false);

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
            <div className="section-header">My images</div>

            {images.length > 0 || isGenerating ? (
                <div className="gallery-grid">
                    {/* Loading Placeholder */}
                    {isGenerating && (
                        <div className="gallery-item loading-placeholder animate-enter">
                            <div className="loading-blur">
                                <Lollipop size={48} color="#ffffff" className="lollipop-spinner" />
                                <span className="loading-text">Developing photo...</span>
                            </div>
                        </div>
                    )}

                    {/* Render Images */}
                    {images.map((img) => (
                        <div key={img.id} className="gallery-item">
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
