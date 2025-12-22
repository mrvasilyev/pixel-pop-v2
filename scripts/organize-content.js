import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicit order provided by user
const stylesOrder = [
    "Candy land",
    "Sketch",
    "Holiday portrait",
    "Dramatic",
    "Plushie",
    "Baseball bobblehead",
    "3D glam doll",
    "Doodle",
    "Inkwork",
    "Ornament",
    "Sugar cookie",
    "Pop art",
    "Fisheye",
    "Art school"
];

// Helper to normalize title for comparison (e.g. "Candy land" -> "candy-land.json")
// But simpler: we load the JSON, check title, match against array.
function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const collections = [
    { path: '../src/content/styles', isOrdered: true },
    { path: '../src/content/discover', isOrdered: false } // Keep alphabetical for discover or leave as is
];

collections.forEach(col => {
    const dir = path.join(__dirname, col.path);
    if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    console.log(`Processing ${files.length} items in ${col.path}...`);

    // Read all contents first
    const items = files.map(file => {
        const filePath = path.join(dir, file);
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return { file, filePath, content };
        } catch (e) {
            console.error(`Error reading ${file}:`, e);
            return null;
        }
    }).filter(Boolean);

    if (col.isOrdered) {
        // Sort items based on the stylesOrder array
        items.sort((a, b) => {
            const indexA = stylesOrder.findIndex(title => title.toLowerCase() === a.content.title.toLowerCase());
            const indexB = stylesOrder.findIndex(title => title.toLowerCase() === b.content.title.toLowerCase());
            
            // If not found in list, put at end
            const valA = indexA === -1 ? 999 : indexA;
            const valB = indexB === -1 ? 999 : indexB;
            
            return valA - valB;
        });
    } else {
        // Fallback or keep alphabetical for other collections
        items.sort((a, b) => a.content.title.localeCompare(b.content.title));
    }

    // Apply Order
    items.forEach((item, index) => {
        // update order
        item.content.order = index + 1;
        
        // update hasPrompt
        const p = item.content.prompt;
        item.content.hasPrompt = (typeof p === 'string' && p.trim().length > 0);

        // write back
        fs.writeFileSync(item.filePath, JSON.stringify(item.content, null, 2));
        console.log(`  [${item.content.order}] ${item.content.title} (${item.file})`);
    });
});
