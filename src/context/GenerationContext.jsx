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
        setIsGenerating(true);
    };

    const stopGeneration = () => {
        setIsGenerating(false);
        // Keep previewUrl briefly if needed for transition, but usually clear it
        // setPreviewUrl(null); // Cleared in useEffect or next start
    };

    // Effect to cycle words and animate dots
    useEffect(() => {
        if (!isGenerating) {
            setLoadingWord("Loading");
            setDots("");
            if (wordIntervalRef.current) clearInterval(wordIntervalRef.current);
            if (dotIntervalRef.current) clearInterval(dotIntervalRef.current);
            return;
        }

        // 1. Pick random word initially and cycle every 3s
        const phrases = headerData.loadingPhrases || ["Loading"];
        let wordIndex = Math.floor(Math.random() * phrases.length);
        setLoadingWord(phrases[wordIndex]);

        wordIntervalRef.current = setInterval(() => {
            wordIndex = (wordIndex + 1) % phrases.length;
            setLoadingWord(phrases[wordIndex]);
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

export const useGeneration = () => {
    const context = useContext(GenerationContext);
    if (!context) {
        throw new Error('useGeneration must be used within a GenerationProvider');
    }
    return context;
};
