import React from 'react';
import './MainScreen.css';

const DiscoverStyles = () => {
    // Generate 15 placeholder items for the 3x5 grid
    const items = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        title: 'Create a holiday card',
        img: 'https://placehold.co/48x48'
    }));

    return (
        <div className="section-container">
            <div className="section-header">Discover something new</div>
            <div className="discover-grid-container">
                {items.map((item) => (
                    /* 
                       User provided structure:
                       <div className="w-72 inline-flex justify-start items-center gap-4">
                          <img className="w-12 h-12 rounded-[10px]" src="..." />
                          <div className="flex-1 justify-start text-white text-xs font-normal font-['Inter']">...</div>
                       </div>
                       Mapped to semantic classes in MainScreen.css
                    */
                    <div key={item.id} className="discover-card">
                        <img className="discover-img" src={item.img} alt="icon" />
                        <div className="discover-text">{item.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiscoverStyles;
