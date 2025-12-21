import './MainScreen.css';
import style1 from '../assets/style-1.png';
import style2 from '../assets/style-2.png';
import style3 from '../assets/style-3.png';

const styles = [
    { id: 1, title: 'Design a birthday invitation', img: style1 },
    { id: 2, title: 'Create a graduation card', img: style2 },
    { id: 3, title: 'Plan a baby shower', img: style3 },
    // Duplicate for scroll effect
    { id: 4, title: 'Design a birthday invitation', img: style1 },
    { id: 5, title: 'Create a graduation card', img: style2 },
];

export default function StyleSelector() {
    return (
        <div className="style-section">
            <h2 className="section-title">Discover something new</h2>
            <div className="style-scroll">
                <div className="flex flex-col gap-2">
                    {/* Row 1 */}
                    {styles.slice(0, 3).map((s) => (
                        <div key={`row1-${s.id}`} className="style-card">
                            <img src={s.img} alt="" className="style-thumb" />
                            <span className="style-info">{s.title}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-2">
                    {/* Row 2 (Offset or different styles, using duplicates for now) */}
                    {styles.slice(1, 4).map((s) => (
                        <div key={`row2-${s.id}`} className="style-card">
                            <img src={s.img} alt="" className="style-thumb" />
                            <span className="style-info">{s.title}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
