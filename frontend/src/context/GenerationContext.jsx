import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import headerData from '../content/header.json';

const GenerationContext = createContext();

export const GenerationProvider = ({ children }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingWord, setLoadingWord] = useState("Loading");
    const [dots, setDots] = useState("");

    // Timer refs to clear intervals
    const wordIntervalRef = useRef(null);
    const dotIntervalRef = useRef(null);

    const [previewUrl, setPreviewUrl] = useState(null);

    const startGeneration = (preview = null) => {
        setPreviewUrl(preview);
        const phrases = headerData.loadingPhrases || ["Loading"];
        const wordIndex = Math.floor(Math.random() * phrases.length);
        setLoadingWord(phrases[wordIndex]);
        setIsGenerating(true);
    };

    const stopGeneration = () => {
        setIsGenerating(false);
        setLoadingWord("Loading");
        setDots("");
        // Keep previewUrl briefly if needed for transition, but usually clear it
        // setPreviewUrl(null); // Cleared in useEffect or next start
    };

    // Effect to cycle words and animate dots
    useEffect(() => {
        if (!isGenerating) {
            return;
        }

        // 1. Cycle every 3s
        const phrases = headerData.loadingPhrases || ["Loading"];
        // We use a local variable for the interval closure, but to persist cross-renders if effect re-runs (it shouldn't if deps are stable),
        // we might want a ref. But here we just start a new interval.
        // We can pick a random start or 0.
        let localWordIndex = Math.floor(Math.random() * phrases.length);

        // Update immediately to sync -> NO, this causes lint error.
        // The initial word is already set in startGeneration.
        // We just need to ensure the interval continues from there or picks a new one.
        // Let's just start the interval.

        wordIntervalRef.current = setInterval(() => {
            localWordIndex = (localWordIndex + 1) % phrases.length;
            setLoadingWord(phrases[localWordIndex]);
        }, 3000);

        // 2. Animate dots every 500ms
        let dotCount = 0;
        dotIntervalRef.current = setInterval(() => {
            dotCount = (dotCount + 1) % 4; // 0, 1, 2, 3
            setDots(".".repeat(dotCount));
        }, 500);

        return () => {
            if (wordIntervalRef.current) clearInterval(wordIntervalRef.current);
            if (dotIntervalRef.current) clearInterval(dotIntervalRef.current);
        };
    }, [isGenerating]);

    // Clean up preview blob URL
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    return (
        <GenerationContext.Provider value={{ isGenerating, loadingWord, dots, previewUrl, startGeneration, stopGeneration }}>
            {children}
        </GenerationContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGeneration = () => {
    const context = useContext(GenerationContext);
    if (!context) {
        throw new Error('useGeneration must be used within a GenerationProvider');
    }
    return context;
};
