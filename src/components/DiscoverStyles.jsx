
import React from 'react';
import './MainScreen.css';

import { usePhotoAction } from '../hooks/usePhotoAction';

const DiscoverStyles = () => {
    const discoverGlob = import.meta.glob('../content/discover/*.json', { eager: true });
    const discoverItems = Object.values(discoverGlob).map(mod => mod.default || mod).sort((a, b) => (a.order || 0) - (b.order || 0));
    const { triggerPhotoAction, PhotoInputs } = usePhotoAction();

    return (
        <div className="section-container">
            <PhotoInputs />
            <div className="section-header">Discover something new</div>
            <div className="discover-grid-container">
                {discoverItems.map((item, i) => (
                    <div key={i} className="discover-card" onClick={() => triggerPhotoAction(item.title)}>
                        <img className="discover-img" src={item.cover || 'https://placehold.co/48x48'} alt="icon" />
                        <div className="discover-text">{item.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiscoverStyles;
