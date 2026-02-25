// Simple API for Aurora Real
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.get('/api/aurora-real', (req, res) => {
    try {
        const state = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega-real/state.json', 'utf8'));
        
        // Get recent trades
        let trades = [];
        try {
            const log = fs.readFileSync('/root/.openclaw/workspace/aurora-omega-real/trades.log', 'utf8');
            trades = log.split('\n').filter(l => l.includes('[TRADE]')).slice(-20).reverse();
        } catch {}
        
        state.recentLog = trades;
        
        res.json(state);
    } catch (e) {
        res.json({ error: e.message });
    }
});

app.get('/api/prices', (req, res) => {
    try {
        const state = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega-real/state.json', 'utf8'));
        res.json(state.prices || {});
    } catch (e) {
        res.json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Aurora Real API running on http://localhost:${PORT}/api/aurora-real`);
});
