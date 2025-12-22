import React from 'react';
import './MainScreen.css';
import { Sparkles, Lollipop } from 'lucide-react';
import headerData from '../content/header.json';

const Gallery = () => {
    // Generate dummy data for gallery
    const images = [];

    // Helper to scroll to styles
    const scrollToStyles = () => {
        const stylesSection = document.querySelector('.h-scroll-list');
        if (stylesSection) stylesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="section-container">
            <div className="section-header">My images</div>

            {images.length > 0 ? (
                <div className="gallery-grid">
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
                    <button className="cta-button" onClick={scrollToStyles}>
                        {headerData.ctaButtonText || "Try a Style"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Gallery;
