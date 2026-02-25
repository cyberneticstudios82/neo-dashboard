// Aurora API - Upstash only (no local files needed)
const express = require('express');
const https = require('https');
const app = express();

// Upstash config
const UPSTASH_URL = "https://cute-lab-59871.upstash.io";
const TOKEN = "AenfAAIncDJkNDgyMWZjZjcwOTA0NjYyOGQ1MDY3MTg4MDA5YmVlY3AyNTk4NzE";

// Serve static files
app.use(express.static(__dirname));

// Helper to fetch from Upstash
function fetchUpstash(key) {
    return new Promise((resolve, reject) => {
        const url = `${UPSTASH_URL}/get/${key}`;
        https.get(url, { headers: { "Authorization": `Bearer ${TOKEN}` } }, (r) => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => {
                try {
                    const parsed = JSON.parse(d);
                    // Result is {result: "{\"bank\":...}"} or {value: "{\"bank\":...}"}
                    let raw = parsed.result || parsed.value;
                    if (raw) {
                        resolve(typeof raw === 'string' ? JSON.parse(raw) : raw);
                    } else {
                        resolve(null);
                    }
                } catch(e) { resolve(null); }
            });
        }).on('error', reject);
    });
}

// Aurora Real API
app.get('/api/aurora-real', async (req, res) => {
    try {
        const data = await fetchUpstash('aurora-real-state');
        if (data) {
            return res.json(data);
        }
        res.json({ bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0, message: 'No data' });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Aurora Terminal API
app.get('/api/aurora-terminal', async (req, res) => {
    try {
        const data = await fetchUpstash('aurora-terminal-state');
        const logs = await fetchUpstash('aurora-terminal-logs');
        
        if (data) {
            data.logs = logs || [];
            return res.json(data);
        }
        res.json({ bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0, message: 'No data' });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Aurora API running on port ${PORT}`);
});
