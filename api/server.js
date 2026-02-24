const express = require('express');
const fs = require('fs');
const app = express();

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
