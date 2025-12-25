import React, { createContext, useContext, useState, useEffect } from 'react';
import { login } from '../api/client';

const UserContext = createContext();

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const token = await login();
            if (!token) {
                setLoading(false);
                return;
            }

            // Need correct URL. Using Vite proxy /api
            const response = await fetch('/api/user/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data);
            } else {
                console.warn("Failed to fetch user", response.status);
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchUser();

        // Optional: Poll for balance updates? Or just expose refreshUser
        const interval = setInterval(fetchUser, 30000); // Poll every 30s for balance updates
        return () => clearInterval(interval);
    }, []);

    const [isPaywallOpen, setIsPaywallOpen] = useState(false);

    // Premium Mode State (Global preference for generation quality)
    const [isPremiumMode, setIsPremiumMode] = useState(false);

    const openPaywall = () => setIsPaywallOpen(true);
    const closePaywall = () => setIsPaywallOpen(false);

    const refreshUser = () => fetchUser();

    return (
        <UserContext.Provider value={{
            user,
            loading,
            refreshUser,
            isPaywallOpen,
            openPaywall,
            closePaywall,
            isPremiumMode,
            setIsPremiumMode
        }}>
            {children}
        </UserContext.Provider>
    );
};
