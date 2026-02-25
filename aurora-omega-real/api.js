// Aurora Real API - Uses Upstash for state
const express = require('express');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

// Upstash config
const UPSTASH_URL = "https://cute-lab-59871.upstash.io";
const TOKEN = "AenfAAIncDJkNDgyMWZjZjcwOTA0NjYyOGQ1MDY3MTg4MDA5YmVlY3AyNTk4NzE";

async function loadFromUpstash(key) {
    try {
        const url = `${UPSTASH_URL}/get/${key}`;
        return new Promise((resolve, reject) => {
            https.get(url, { headers: { "Authorization": `Bearer ${TOKEN}` } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed.result ? JSON.parse(parsed.result) : null);
                    } catch(e) { resolve(null); }
                });
            }).on('error', reject);
        });
    } catch (e) { return null; }
}

// API Endpoint - Aurora Real
app.get('/api/aurora-real', async (req, res) => {
    try {
        // Try Upstash first (for Vercel)
        let state = await loadFromUpstash('aurora-real-state');
        
        // Fallback to local file
        if (!state) {
            try {
                state = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega-real/state.json', 'utf8'));
            } catch {}
        }
        
        // Get recent trades from log
        let recentLog = [];
        try {
            const log = fs.readFileSync('/root/.openclaw/workspace/aurora-omega-real/trades.log', 'utf8');
            recentLog = log.split('\n').filter(l => l.includes('[TRADE]')).slice(-20);
        } catch {}
        
        if (state) {
            state.recentLog = recentLog;
            res.json(state);
        } else {
            res.json({ bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0, openTrades: 0 });
        }
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Serve static dashboard
app.use(express.static('/root/.openclaw/workspace/aurora-omega-real'));

app.listen(PORT, () => {
    console.log(`🚀 Aurora Real API: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
});
