import React from 'react';
import './MainScreen.css';

import { usePhotoAction } from '../hooks/usePhotoAction';

export default function TopStyles() {
    const stylesGlob = import.meta.glob('../content/styles/*.json', { eager: true });
    const styles = Object.values(stylesGlob).map(mod => mod.default || mod).sort((a, b) => (a.order || 0) - (b.order || 0));
    const { triggerPhotoAction, PhotoInputs } = usePhotoAction();

    return (
        <div className="section-container">
            <PhotoInputs />
            <div className="section-header">Try a style on an image</div>
            <div className="h-scroll-list">
                {styles.map((style, i) => (
                    <div key={i} className="top-style-card" onClick={() => triggerPhotoAction(style.title)}>
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
