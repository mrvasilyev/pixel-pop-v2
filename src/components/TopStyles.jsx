import React from 'react';
import './MainScreen.css';

export default function TopStyles() {
    // 14 items as requested
    const styles = [
        { id: 1, title: 'Retro', color: '#FF6B6B' },
        { id: 2, title: 'Cyber', color: '#4ECDC4' },
        { id: 3, title: 'Noir', color: '#45B7D1' },
        { id: 4, title: 'Anime', color: '#96CEB4' },
        { id: 5, title: 'Vapor', color: '#FFEEAD' },
        { id: 6, title: 'Glitch', color: '#D4A5A5' },
        { id: 7, title: 'Synth', color: '#9B59B6' },
        { id: 8, title: 'Neon', color: '#3498DB' },
        { id: 9, title: 'Pixel', color: '#F1C40F' },
        { id: 10, title: 'Oil', color: '#E67E22' },
        { id: 11, title: 'Sketch', color: '#ECF0F1' },
        { id: 12, title: 'Pop', color: '#E74C3C' },
        { id: 13, title: 'Clay', color: '#1ABC9C' },
        { id: 14, title: 'Origami', color: '#2ECC71' },
    ];

    return (
        <div className="section-container">
            <div className="section-header">Try a style on an image</div>
            <div className="h-scroll-list">
                {styles.map((style) => (
                    <div key={style.id} className="top-style-card">
                        <div
                            className="top-style-img"
                            style={{ backgroundColor: style.color }}
                        />
                        <div className="top-style-title">{style.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
