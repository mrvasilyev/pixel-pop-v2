import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import './QualitySwitcher.css';

// Solid Lock Icon (Closed)
const LockClosedIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10H17V7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7V10H6C4.89543 10 4 10.8954 4 12V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V12C20 10.8954 19.1046 10 18 10ZM9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7V10H9V7Z" />
    </svg>
);

// Solid Lock Icon (Open)
const LockOpenIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V10H18C19.1046 10 20 10.8954 20 12V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V12C4 10.8954 4.89543 10 6 10H7V7ZM12 4C10.3431 4 9 5.34315 9 7V10H15V7C15 5.34315 13.6569 4 12 4Z" />
    </svg>
);

const QualitySwitcher = () => {
    // Local state to reflect the toggle visually
    // If user has > 100 credits, they can toggle Pro On/Off?
    // Or is "Pro" simply ON if they have credits?
    // Let's assume standard toggle behavior: User can choose to enable/disable Pro if unlocked.
    // Use Global State
    const { user, openPaywall, isPremiumMode, setIsPremiumMode } = useUser();

    // Local visual state can mirror global, or use it directly.
    // Let's use it directly.
    const isProOn = isPremiumMode;
    const setIsProOn = setIsPremiumMode;

    // Determine if Pro is unlocked: Check if user has premium credits
    const isProUnlocked = (user?.premium_credits || 0) > 0;

    // Effect: If locked, force Off
    useEffect(() => {
        if (!isProUnlocked) {
            setIsProOn(false);
        }
    }, [isProUnlocked]);

    const handleToggle = (e) => {
        if (!isProUnlocked) {
            e.preventDefault(); // Keep checkbox unchecked
            // Trigger Haptic
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
            }
            openPaywall();
            return;
        }

        // Allow toggle if unlocked
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.selectionChanged();
        }
        setIsProOn(e.target.checked);
    };

    return (
        <div className="quality-switcher-container">
            <span style={{ fontSize: '14px', fontWeight: 500, marginRight: '8px' }}>Premium</span>
            <label className="checkbox-field checkbox-without-caption checkbox-field-toggle">
                <input
                    className="checkbox-field-input"
                    type="checkbox"
                    checked={isProOn}
                    onChange={handleToggle}
                />
                <div className="checkbox-toggle">
                    <div className="checkbox-toggle-circle"></div>
                </div>
                {/* Hidden caption as per Telegram Web K structure */}
                <div className="checkbox-caption" style={{ display: 'none' }}>Premium</div>
            </label>
        </div>
    );
};

export default QualitySwitcher;
