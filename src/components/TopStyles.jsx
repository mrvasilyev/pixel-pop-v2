import React from 'react';
import './MainScreen.css';

export default function TopStyles() {
    const stylesGlob = import.meta.glob('../content/styles/*.json', { eager: true });
    const styles = Object.values(stylesGlob).map(mod => mod.default || mod).sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="section-container">
            <div className="section-header">Try a style on an image</div>
            <div className="h-scroll-list">
                {styles.map((style, i) => (
                    <div key={i} className="top-style-card">
                        <div
                            className="top-style-img"
                            style={style.cover ? { backgroundImage: `url(${style.cover})`, backgroundSize: 'cover' } : { backgroundColor: '#333' }}
                        />
                        <div className="top-style-title">{style.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
