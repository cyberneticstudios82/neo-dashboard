const express = require('express');
const fs = require('fs');
const https = require('https');
const app = express();

// Serve static files
app.use(express.static('/root/.openclaw/workspace'));

app.get('/aurora.json', (req, res) => {
    try {
        // Get latest state
        const state = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/state.json', 'utf8'));
        
        // Get recent trades
        let trades = [];
        try {
            trades = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/trades.json', 'utf8'));
        } catch {}
        
        // Add signals list (from Bankr)
        let signals_list = [];
        try {
            const signalsData = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/signals.json', 'utf8'));
            signals_list = signalsData.signals || [];
        } catch {}
        
        state.recent_trades = trades.slice(-10).reverse();
        state.signals_list = signals_list;
        
        // Save to workspace for static serving
        fs.writeFileSync('/root/.openclaw/workspace/aurora.json', JSON.stringify(state));
        
        res.json(state);
    } catch (e) {
        res.json({ bank: 10000, pnl: 0, trades: 0, wins: 0, losses: 0, agents: {}, prices: {} });
    }
});

app.get('/api/aurora', (req, res) => {
    try {
        const state = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/state.json', 'utf8'));
        res.json(state);
    } catch (e) {
        res.json({ bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0 });
    }
});

app.get('/api/hft', (req, res) => {
    try {
        const state = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/hft_state.json', 'utf8'));
        res.json(state);
    } catch (e) {
        res.json({ bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0 });
    }
});

app.get('/api/trades', (req, res) => {
    try {
        const trades = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/trades.json', 'utf8'));
        res.json(trades.slice(-20).reverse());
    } catch (e) {
        res.json([]);
    }
});

app.get('/api/combined', (req, res) => {
    try {
        const aurora = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/state.json', 'utf8'));
        const hft = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/hft_state.json', 'utf8'));
        const trades = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/trades.json', 'utf8'));
        res.json({ aurora, hft, trades: trades.slice(-20).reverse() });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Aurora Real - Pure paper trading with real conditions
app.get('/api/aurora-real', async (req, res) => {
    // Upstash config
    const UPSTASH_URL = "https://cute-lab-59871.upstash.io";
    const TOKEN = "AenfAAIncDJkNDgyMWZjZjcwOTA0NjYyOGQ1MDY3MTg4MDA5YmVlY3AyNTk4NzE";
    
    let data = null;
    
    // Try Upstash first (for Vercel compatibility)
    try {
        const url = `${UPSTASH_URL}/get/aurora-real-state`;
        const response = await new Promise((resolve, reject) => {
            https.get(url, { headers: { "Authorization": `Bearer ${TOKEN}` } }, (r) => {
                let d = '';
                r.on('data', chunk => d += chunk);
                r.on('end', () => resolve(d));
            }).on('error', reject);
        });
        
        const parsed = JSON.parse(response);
        
        // Upstash returns {result: "{\"value\":\"{\\\"bank\\\":...}\"}"} - double nested!
        let raw = parsed.result;
        
        if (raw) {
            // First parse: result is a string containing JSON
            let inner = typeof raw === 'string' ? JSON.parse(raw) : raw;
            
            // Second parse: inner.value contains the actual data
            if (inner && inner.value) {
                let actual = inner.value;
                if (typeof actual === 'string') {
                    data = JSON.parse(actual);
                } else {
                    data = actual;
                }
            }
        }
    } catch (e) {
        console.log('Upstash error:', e.message);
    }
    
    // Fallback to local file
    if (!data) {
        try {
            data = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega-real/state.json', 'utf8'));
        } catch (e) {
            data = { bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0 };
        }
    }
    
    // Get recent trades from log
    try {
        const log = fs.readFileSync('/root/.openclaw/workspace/aurora-omega-real/trades.log', 'utf8');
        data.recentLog = log.split('\n').filter(l => l.includes('[TRADE]')).slice(-20);
    } catch {}
    
    res.json(data);
});

const PORT = 3000;

// Serve static files from aurora-omega-real
app.use(express.static('/root/.openclaw/workspace/aurora-omega-real'));

app.listen(PORT, () => {
    console.log(`🚀 Aurora Real API + Dashboard: http://localhost:${PORT}/dashboard.html`);
});
