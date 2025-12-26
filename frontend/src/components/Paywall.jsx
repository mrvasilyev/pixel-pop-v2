import React, { useEffect, useRef } from 'react';
import { CircleX, Check } from 'lucide-react';
import './Paywall.css';
import { login, API_BASE } from '../api/client';

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        stars: 250,
        priceDisplay: '250 Stars',
        features: ['10 Medium-quality images', 'Fast generation', 'All basic styles', 'Small watermark'],
        isBest: false,
        icon: '/stars.png',
        creditType: 'basic',
        basicCredits: 10,
        premiumCredits: 0
    },
    {
        id: 'creator',
        name: 'Creator',
        stars: 1500,
        priceDisplay: '1500 Stars',
        features: [
            '10 Medium images',
            '5 Pro images',
            'Pro image quality',
            'No watermark'
        ],
        isBest: true,
        icon: '/stars.png',
        creditType: 'bundle',
        basicCredits: 10,
        premiumCredits: 5
    },
    {
        id: 'magician',
        name: 'Magician',
        stars: 1500,
        priceDisplay: '1500 Stars',
        features: [
            '10 Pro images',
            'Maximum realism',
            'Pro image quality',
            'No watermark'
        ],
        isBest: false,
        icon: '/stars.png',
        creditType: 'premium',
        basicCredits: 0,
        premiumCredits: 10
    }
];

const Paywall = ({ isOpen, onClose }) => {
    const carouselRef = useRef(null);
    const [theme, setTheme] = React.useState('light');

    useEffect(() => {
        const detectTheme = () => {
            if (window.Telegram?.WebApp?.colorScheme) {
                return window.Telegram.WebApp.colorScheme;
            }
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
            return 'light';
        };

        setTheme(detectTheme());

        if (!window.Telegram?.WebApp) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e) => setTheme(e.matches ? 'dark' : 'light');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && carouselRef.current) {
            setTimeout(() => {
                if (carouselRef.current) {
                    const container = carouselRef.current;
                    const cards = container.querySelectorAll('.plan-card');
                    if (cards[1]) {
                        const card = cards[1];
                        const scrollLeft = card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
                        container.scrollTo({ left: scrollLeft, behavior: 'instant' });
                    }
                }
            }, 10);

            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
        }
    }, [isOpen]);

    const handleBuy = async (plan) => {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
        console.log(`Initiating purchase for ${plan.name} (${plan.stars} Stars)`);

        try {
            const token = await login();
            if (!token) return;

            if (!token) return;

            // 1. Create Invoice Link via Backend
            const response = await fetch(`${API_BASE}/api/payment/create-invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan_id: plan.id })
            });

            if (!response.ok) {
                console.error("Invoice creation failed", await response.text());
                alert("Could not initialize payment. Please try again.");
                return;
            }

            const data = await response.json();
            const invoiceUrl = data.invoice_link;

            // 2. Open Invoice in Telegram
            if (window.Telegram?.WebApp?.openInvoice) {
                window.Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
                    if (status === 'paid') {
                        console.log("Payment successful!");
                        onClose();
                        window.location.reload();
                    } else if (status === 'cancelled') {
                        console.log("Payment cancelled.");
                    } else if (status === 'failed') {
                        console.error("Payment failed.");
                        alert("Payment failed.");
                    } else {
                        console.log("Payment status:", status);
                    }
                });
            } else {
                // Fallback (e.g. open link if independent, though Stars usually requires WebApp context)
                window.open(invoiceUrl, '_blank');
            }

        } catch (error) {
            console.error("Purchase error:", error);
            alert(`Purchase failed: ${error.message || error}`);
        }
    };

    if (!isOpen) return null;

    const themeClass = theme === 'dark' ? 'paywall-theme-dark' : 'paywall-theme-light';

    return (
        <div className={`paywall-overlay ${themeClass}`} onClick={onClose}>
            <div className="paywall-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>
                    <CircleX size={28} />
                </button>

                <div className="paywall-header">

                    {/* Centered Image */}
                    <div style={{ marginBottom: '10px', marginTop: '10px' }}>
                        <img src="/stars.png" alt="Stars" style={{ width: '48px', height: '48px' }} />
                    </div>

                    <h2 className="paywall-title">Create a few images worth keeping</h2>
                    <p className="paywall-subtitle">Most people stop after 10–15 great results</p>
                </div>

                <div className="carousel-container" ref={carouselRef}>
                    {PLANS.map((plan) => (
                        <div key={plan.id} className="plan-card">
                            {plan.isBest && (
                                <div className="best-choice-badge">
                                    BEST CHOICE
                                </div>
                            )}



                            <div className="plan-name">{plan.name}</div>
                            <div className="plan-stars">
                                {plan.stars} <img src="/stars.png" alt="" className="star-icon-text" />
                            </div>

                            <ul className="plan-features">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="feature-item">
                                        <Check size={16} className="feature-icon" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button className="cta-button" onClick={() => handleBuy(plan)}>
                                Purchase Pack
                            </button>
                        </div>
                    ))}
                </div>

                <p className="paywall-footer-note">
                    No subscription • One-time purchase • Images never expire
                </p>
            </div>
        </div>
    );
};

export default Paywall;
