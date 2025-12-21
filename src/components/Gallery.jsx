import React from 'react';
import './MainScreen.css';

const Gallery = () => {
    // Generate dummy data for gallery
    const images = Array.from({ length: 21 }, (_, i) => ({
        id: i,
        src: `https://placehold.co/100x100?text=${i + 1}`
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
