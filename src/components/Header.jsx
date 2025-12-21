import React from 'react';
import './MainScreen.css';

const Header = () => {
    return (
        <div className="header">
            <div className="header-content">
                <h1 className="header-title">Print your memories</h1>
                <p className="header-subtitle">Pixel Pop makes it easy</p>
                <button className="header-button">Let's go</button>
            </div>
        </div>
    );
};

export default Header;
