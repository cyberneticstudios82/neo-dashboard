const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Upstash config
const UPSTASH_URL = "https://cute-lab-59871.upstash.io";
const TOKEN = "AenfAAIncDJkNDgyMWZjZjcwOTA0NjYyOGQ1MDY3MTg4MDA5YmVlY3AyNTk4NzE";

function fetchFromUpstash(key) {
  return new Promise((resolve, reject) => {
    const url = `${UPSTASH_URL}/get/${key}`;
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
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes - fetch from Upstash
app.get('/api/aurora', async (req, res) => {
  const data = await fetchFromUpstash('aurora');
  res.json(data || { bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0 });
});

app.get('/api/hft', async (req, res) => {
  const data = await fetchFromUpstash('hft');
  res.json(data || { bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0 });
});

app.get('/api/combined', async (req, res) => {
  const aurora = await fetchFromUpstash('aurora');
  const hft = await fetchFromUpstash('hft');
  const trades = await fetchFromUpstash('trades');
  res.json({ aurora: aurora||{}, hft: hft||{}, trades: trades||[] });
});

app.get('/api/trades', async (req, res) => {
  const trades = await fetchFromUpstash('trades');
  res.json(trades || []);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Aurora running on port ${PORT}`);
});
