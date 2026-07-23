const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/NZIN/Downloads/개인 개발분/미로찾기';
const jsDir = path.join(projectRoot, 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const htmlFiles = ['index.html', 'cards_list.html', 'map_editor.html', 'monster_plan.html', 'weapon_combinations.html'];

console.log("=== 1. Checking script loading order in index.html ===");
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const scriptSrcMatches = [...indexHtml.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(m => m[1]);
console.log("Scripts loaded in index.html in order:");
scriptSrcMatches.forEach((src, i) => console.log(`  ${i+1}. ${src}`));

// Check if any js files are missing in index.html
files.forEach(f => {
    const rel = `js/${f}`;
    if (!scriptSrcMatches.includes(rel)) {
        console.log(`[NOT LOADED IN INDEX.HTML] js/${f} is in /js folder but not loaded in index.html!`);
    }
});

// Check HTML script loads in all html files
console.log("\n=== 2. Check html files script references ===");
htmlFiles.forEach(h => {
    const content = fs.readFileSync(path.join(projectRoot, h), 'utf8');
    const scripts = [...content.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(m => m[1]);
    scripts.forEach(s => {
        if (s.startsWith('http://') || s.startsWith('https://')) return;
        const fullPath = path.join(projectRoot, s);
        if (!fs.existsSync(fullPath)) {
            console.log(`[BROKEN SCRIPT TAG] In ${h}: ${s} does NOT exist!`);
        }
    });
});

console.log("\n=== 3. Scope / Reference Scan ===");
// Collect all global identifiers defined across all scripts
const globals = new Set([
    // Browser builtins
    'window', 'document', 'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
    'Set', 'Map', 'Promise', 'JSON', 'RegExp', 'Error', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
    'Image', 'Audio', 'AudioContext', 'webkitAudioContext', 'Path2D', 'CanvasRenderingContext2D', 'HTMLCanvasElement',
    'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'FileReader', 'Blob', 'URL', 'localStorage', 'sessionStorage',
    'fetch', 'alert', 'confirm', 'prompt', 'navigator', 'screen', 'location', 'history', 'performance', 'speechSynthesis',
    'SpeechSynthesisUtterance', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver',
    // External libraries in index.html (Firebase, FontAwesome, etc.)
    'firebase', 'initializeApp', 'getDatabase', 'ref', 'set', 'get', 'onValue', 'push', 'child', 'update', 'remove'
]);

files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    // regex for classes, top-level functions, top-level const/let/var
    const matches = code.matchAll(/(?:class|function|var|let|const)\s+([a-zA-Z0-9_$]+)/g);
    for (const m of matches) {
        globals.add(m[1]);
    }
    const winMatches = code.matchAll(/window\.([a-zA-Z0-9_$]+)/g);
    for (const m of winMatches) {
        globals.add(m[1]);
    }
});

// Scan for property typos or suspicious method calls
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        // Check window.xxx vs top-level function names mismatched
        // Check for common bugs: array length vs lenght, getContext('2d'), etc.
        if (/\.lenght\b/.test(line)) {
            console.log(`[TYPO] ${file}:${lineNum} '.lenght' typo -> ${trimmed}`);
        }
        if (/\.push\s*\(\s*\.\.\./.test(line) && /\.push\s*\(\s*\.\.\.\s*undefined/.test(line)) {
            console.log(`[SUSPICIOUS SPREAD] ${file}:${lineNum} -> ${trimmed}`);
        }
    });
});
