import React from 'react';
import './Skeleton.css';

const Skeleton = ({ className, style, width, height, borderRadius }) => {
    const customStyle = {
        width,
        height,
        borderRadius,
        ...style
    };

    return (
        <div
            className={`skeleton-loader ${className || ''}`}
            style={customStyle}
        />
    );
};

export default Skeleton;
