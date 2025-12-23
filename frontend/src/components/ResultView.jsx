import './ResultView.css';
import placeholder from '../assets/result-placeholder.png';

export default function ResultView({ onClose }) {
    return (
        <div className="result-view">
            <div className="result-image-container">
                <img src={placeholder} alt="Result" className="result-image" />

                <div className="result-footer">
                    <button className="result-action-btn" onClick={onClose}>
                        Try another style
                    </button>
                </div>
            </div>
        </div>
    );
}
