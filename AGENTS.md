# AGENTS.md - Aurora Trading System

## Project Structure

```
/root/.openclaw/workspace/
├── index.html          # Main 3D trading dashboard (Three.js)
├── aurora-omega/       # Multi-agent trading system
│   └── background/
│       └── trader.js   # Paper trading bot
├── astra/              # Personal health companion
│   ├── core/astra_brain.py
│   └── whatsapp/scheduler.py
├── trading-system/     # ML trading architecture
├── repos/              # Cloned repositories
│   ├── ml4t/           # Machine Learning for Trading
│   ├── pine-scripts/   # Trading strategies
│   └── agentsmd/       # AGENTS.md format reference
└── memory/
    └── 2026-02-24.md   # Daily memory log
```

## Quick Commands

| Command | Purpose |
|---------|---------|
| `cd /root/.openclaw/workspace` | Go to workspace |
| `python3 astra/core/astra_brain.py` | Run ASTRA |
| `node aurora-omega/background/trader.js` | Run trading bot |
| `git add -A && git commit -m "..."` | Commit changes |
| `git push --force` | Push to GitHub |

## Development Guidelines

- Use paper trading first (no real money)
- Test in browser before deploying to Vercel
- Keep dashboard simple - avoid complex libraries that may break
- Voice uses Web Speech API (browser-native)
- WhatsApp via OpenClaw message tool

## Testing

- Dashboard: https://node-dashboard-j1qk.vercel.app
- Test in local browser first
- Check console for JS errors

## Important Notes

- Theme: cyan/teal (NOT pink)
- 6 trading agents + 7 Aurora swarm agents
- Voice with unique pitch per agent
- Target: $10,000 → $30,000 paper trading
