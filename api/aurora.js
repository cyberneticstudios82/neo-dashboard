// Aurora State API
const fs = require('fs');

module.exports = (req, res) => {
  try {
    const state = JSON.parse(fs.readFileSync('/root/.openclaw/workspace/aurora-omega/logs/state.json', 'utf8'));
    res.json(state);
  } catch (e) {
    res.json({ bank: 100, pnl: 0, trades: 0, wins: 0, losses: 0 });
  }
};
