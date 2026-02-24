---
name: hummingbot-hft
description: High-frequency trading with Hummingbot. Use for arbitrage, market making, and algorithmic trading across 140+ exchanges. Requires Docker for deployment.
---

# Hummingbot HFT Skill

## Overview

[Hummingbot](https://github.com/hummingbot/hummingbot) is an open-source framework for high-frequency crypto trading bots. Supports 140+ exchanges.

## Prerequisites

- Docker installed
- API keys for exchanges
- Wallet for DEX trading (optional)

## Installation

```bash
# Clone Hummingbot
git clone https://github.com/hummingbot/hummingbot.git
cd hummingbot

# Setup with Docker
make setup
make deploy

# Attach to container
docker attach hummingbot
```

## Supported Exchanges

### CEX (Centralized)
- Binance, Bybit, OKX, Kraken, Coinbase
- Gate.io, KuCoin, Bitget, Hyperliquid

### DEX (Decentralized)
- dYdX, Injective, Jupiter (Solana)
- PancakeSwap, Curve, Balancer

## Strategies

### 1. Market Making
Place buy/sell orders to profit from spread

### 2. Arbitrage
Profit from price differences across exchanges

### 3. Directional
Trend-following strategies

## Commands (inside Hummingbot)

```
# Start a strategy
start --strategy arbitrage --bot_id my_bot

# Check status
status

# Check balance
balance

# Stop bot
stop
```

## Aurora Integration

Aurora currently uses Bankr Signals for paper trading. For real HFT:
1. Set up Hummingbot with Docker
2. Connect to exchange APIs
3. Use paper trading mode first
4. Monitor via Aurora dashboard

## Risk Warning

HFT is risky. Start with paper trading and small amounts.
