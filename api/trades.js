// Trades API
const fs = require('fs');

module.exports = (req, res) => {
  try {
    const trades = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/trades.json', 'utf8'));
    res.json(trades.slice(-10).reverse()); // Last 10 trades
  } catch (e) {
    res.json([]);
  }
};
