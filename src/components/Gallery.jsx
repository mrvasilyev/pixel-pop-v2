import React from 'react';
import './MainScreen.css';

const Gallery = () => {
    // Generate dummy data for gallery
    const images = [
        'pixel-pop-hyper-moment-4633.png',
        'pixel-pop-mega-blast-1825.png',
        'pixel-pop-retro-creation-2230.png',
        'pixel-pop-retro-snapshot-3994.png',
        'pixel-pop-shiny-masterpiece-2363.png',
        'pixel-pop-shiny-masterpiece-8247.png',
        'pixel-pop-super-memory-5895.png',
        'pixel-pop-super-pixel-7802.png',
        'pixel-pop-super-vibe-9407.png'
    ].map((filename, i) => ({
        id: i,
        src: `/people/${filename}`
    }));

    return (
        <div className="section-container">
            <div className="section-header">My images</div>
            <div className="gallery-grid">
                {images.map((img) => (
                    <div key={img.id} className="gallery-item">
                        <img src={img.src} alt={`Gallery ${img.id}`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Gallery;
