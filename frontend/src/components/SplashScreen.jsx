```javascript
import React from 'react';
import './SplashScreen.css';

const SplashScreen = ({ visible }) => {
    if (!visible) return null;

    return (
        <div className="splash-screen">
            <div className="splash-content">
                <img src="/LOLLY_D.svg" alt="Loading..." className="splash-spinner" />
            </div>
        </div>
    );
};

export default SplashScreen;
```
