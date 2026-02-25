// Aurora Terminal - 5-Minute BTC Trading System
// Streams Binance + Polymarket, computes fair value, places maker quotes

const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');

// ============== UPSTASH CONFIG ==============
const UPSTASH_URL = "https://cute-lab-59871.upstash.io";
const UPSTASH_TOKEN = "AenfAAIncDJkNDgyMWZjZjcwOTA0NjYyOGQ1MDY3MTg4MDA5YmVlY3AyNTk4NzE";

async function saveToUpstash(key, data) {
    try {
        const url = `${UPSTASH_URL}/set/${key}`;
        await new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UPSTASH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => resolve(d));
            });
            req.on('error', reject);
            req.write(JSON.stringify(data));
            req.end();
        });
    } catch (e) { console.log('Upstash save error:', e.message); }
}

// ============== CONFIG ==============
const CONFIG = {
    // Binance WebSocket
    binanceWS: 'wss://stream.binance.com:9443/ws',
    
    // Polymarket API
    polymarketAPI: 'https://clob.polymarket.com',
    
    // Trading
    minConfidence: 0.75,
    positionSize: 10, // Starting with paper money
    maxPositionSize: 100,
    
    // Timing
    windowSize: 5 * 60 * 1000, // 5 minutes
    repriceThreshold: 800, // ms
    
    // Thresholds
    momentumThreshold: 0.85,
    volatilityBandWidth: 0.002, // 0.2%
};

class AuroraTerminal {
    constructor() {
        // Market data
        this.binanceData = {
            btcPrice: 0,
            btcVolume: 0,
            orderBook: { bids: [], asks: [] },
            momentum: 0
        };
        
        this.polymarketData = {
            btcYes: 0,
            btcNo: 0,
            lastPrice: 0
        };
        
        // Fair value
        this.fairValue = 0;
        this.windowStart = Date.now();
        
        // Positions
        this.positions = [];
        this.pnl = 0;
        this.pnlPercent = 0;
        this.trades = [];
        
        // State
        this.running = true;
        
        this.logFile = '/root/.openclaw/workspace/aurora-terminal/trades.log';
        this.stateFile = '/root/.openclaw/workspace/aurora-terminal/state.json';
        
        this.init();
    }

    init() {
        console.log('🎯 AURORA TERMINAL - 5-Min BTC Trading');
        console.log('📡 Connecting to Binance + Polymarket...');
        
        this.connectBinance();
        this.connectPolymarket();
        
        // Start trading cycle every 5 seconds
        setInterval(() => this.tradingCycle(), 5000);
        
        // US Market focus logging
        setInterval(() => {
            const utc = new Date();
            const hour = utc.getUTCHours();
            if (hour >= 14 && hour < 21) {
                console.log('🟢 US Market Active - High Liquidity');
            }
        }, 60000);
        
        // New 5-min window every 5 minutes
        setInterval(() => this.newWindow(), CONFIG.windowSize);
        
        // Save state periodically
        setInterval(() => this.saveState(), 30000);
    }

    // ============ BINANCE WEBSOCKET ============
    connectBinance() {
        // BTC/USDT order book and trades
        const streams = [
            'btcusdt@depth20@100ms',
            'btcusdt@trade',
            'btcusdt@kline_1m'
        ];
        
        const wsUrl = `${CONFIG.binanceWS}/${streams.join('/')}`;
        this.binanceWS = new WebSocket(wsUrl);
        
        this.binanceWS.on('message', (data) => {
            const msg = JSON.parse(data);
            
            if (msg.e === 'depthUpdate') {
                this.binanceData.orderBook = {
                    bids: msg.bids.slice(0, 10).map(b => ({ price: parseFloat(b[0]), qty: parseFloat(b[1]) })),
                    asks: msg.asks.slice(0, 10).map(a => ({ price: parseFloat(a[0]), qty: parseFloat(a[1]) }))
                };
            } else if (msg.e === 'trade') {
                this.binanceData.btcPrice = parseFloat(msg.p);
                this.binanceData.btcVolume += parseFloat(msg.q);
            }
        });
        
        this.binanceWS.on('error', (err) => {
            console.log('Binance WS error:', err.message);
            setTimeout(() => this.connectBinance(), 5000);
        });
    }

    // ============ POLYMARKET ============
    async connectPolymarket() {
        // Fetch BTC 5-min market
        try {
            const url = 'https://clob.polymarket.com/markets?conditionId=a036aa88d0e2b5433074204a7c1b3f81d6bfdd8b269899e5d205b1b66c17deef';
            
            const data = await this.fetchJSON(url);
            
            if (data && data.length > 0) {
                const market = data[0];
                this.polymarketData.btcYes = parseFloat(market.yesPrice || 0.5);
                this.polymarketData.btcNo = parseFloat(market.noPrice || 0.5);
                
                // Convert to probability
                this.polymarketData.probability = this.polymarketData.btcYes;
            }
        } catch (e) {
            console.log('Polymarket error:', e.message);
        }
        
        // Update every 10 seconds
        setTimeout(() => this.connectPolymarket(), 10000);
    }

    // ============ FAIR VALUE CALCULATION ============
    computeFairValue() {
        const { btcPrice } = this.binanceData;
        const { probability } = this.polymarketData;
        
        if (!btcPrice || !probability) return null;
        
        // Fair value based on Polymarket probability
        // If probability > 0.5, expect UP in next 5 min
        const spotMomentum = this.computeMomentum();
        const volatility = this.computeVolatility();
        
        // Fair value = spot + momentum adjustment + volatility
        const momentumAdjustment = (probability - 0.5) * 2; // -1 to 1
        const fairValue = btcPrice * (1 + momentumAdjustment * 0.001 + volatility);
        
        return {
            fairValue,
            confidence: Math.abs(probability - 0.5) * 2, // 0 to 1
            direction: probability > 0.5 ? 'UP' : 'DOWN',
            timestamp: Date.now()
        };
    }

    computeMomentum() {
        // Simple momentum based on recent price action
        const { btcPrice, btcVolume } = this.binanceData;
        if (!btcPrice || !btcVolume) return 0;
        
        // Volume-weighted momentum
        return Math.min(btcVolume / 1000000, 1); // Normalize
    }

    computeVolatility() {
        const { orderBook } = this.binanceData;
        if (!orderBook.asks.length || !orderBook.bids.length) return 0;
        
        const bestAsk = orderBook.asks[0]?.price || 0;
        const bestBid = orderBook.bids[0]?.price || 0;
        const spread = (bestAsk - bestBid) / bestBid;
        
        return spread;
    }

    // ============ TRADING LOGIC ============
    async tradingCycle() {
        const fairValueData = this.computeFairValue();
        
        if (!fairValueData || fairValueData.confidence < CONFIG.minConfidence) {
            return;
        }
        
        const { direction, confidence, fairValue } = fairValueData;
        
        // Check if we're in the last 20-40 seconds of window
        const windowElapsed = Date.now() - this.windowStart;
        const windowRemaining = CONFIG.windowSize - windowElapsed;
        
        // High probability + late in window = opportunity
        if (confidence > CONFIG.momentumThreshold && windowRemaining < 40000 && windowRemaining > 20000) {
            await this.placeQuote(direction, confidence, fairValue);
        }
        
        // Check existing positions
        await this.managePositions();
    }

    async placeQuote(direction, confidence, fairValue) {
        // Check if we already have a position
        const existing = this.positions.find(p => p.status === 'OPEN');
        if (existing) return;
        
        // Calculate position size based on confidence
        const size = CONFIG.positionSize * (1 + confidence);
        
        const position = {
            id: Date.now(),
            direction,
            entryPrice: this.binanceData.btcPrice,
            size: Math.min(size, CONFIG.maxPositionSize),
            confidence,
            fairValue,
            status: 'OPEN',
            entryTime: new Date().toISOString(),
            pnl: 0
        };
        
        this.positions.push(position);
        this.trades.push(position);
        
        this.log('TRADE', `OPEN: ${direction} BTC @ $${position.entryPrice} | Size: $${position.size.toFixed(2)} | Conf: ${(confidence * 100).toFixed(0)}%`);
        
        console.log(`\n🎯 QUOTE PLACED: ${direction}`);
        console.log(`   Entry: $${position.entryPrice}`);
        console.log(`   Size: $${position.size.toFixed(2)}`);
    }

    async managePositions() {
        const currentPrice = this.binanceData.btcPrice;
        
        for (const pos of this.positions) {
            if (pos.status !== 'OPEN') continue;
            
            // Calculate P&L
            if (pos.direction === 'UP') {
                pos.pnl = (currentPrice - pos.entryPrice) / pos.entryPrice * pos.size;
            } else {
                pos.pnl = (pos.entryPrice - currentPrice) / pos.entryPrice * pos.size;
            }
            
            const pnlPercent = (pos.pnl / pos.size) * 100;
            
            // Take profit at 5% or stop loss at 2%
            if (pnlPercent >= 5) {
                await this.closePosition(pos, currentPrice, 'Take profit +5%');
            } else if (pnlPercent <= -2) {
                await this.closePosition(pos, currentPrice, 'Stop loss -2%');
            }
            
            // Check window expiration
            const windowElapsed = Date.now() - this.windowStart;
            if (windowElapsed >= CONFIG.windowSize) {
                await this.closePosition(pos, currentPrice, 'Window close');
            }
        }
    }

    async closePosition(pos, exitPrice, reason) {
        pos.status = 'CLOSED';
        pos.exitPrice = exitPrice;
        pos.exitTime = new Date().toISOString();
        pos.exitReason = reason;
        
        this.pnl += pos.pnl;
        
        const pnlPercent = (pos.pnl / pos.size) * 100;
        
        this.log('TRADE', `CLOSED: ${pos.direction} BTC @ $${exitPrice} | P&L: $${pos.pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Reason: ${reason}`);
        
        console.log(`\n🔴 POSITION CLOSED: ${reason}`);
        console.log(`   P&L: $${pos.pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
    }

    newWindow() {
        this.windowStart = Date.now();
        
        // Close any open positions
        const currentPrice = this.binanceData.btcPrice;
        for (const pos of this.positions.filter(p => p.status === 'OPEN')) {
            this.closePosition(pos, currentPrice, 'New window');
        }
        
        console.log(`\n🎯 NEW 5-MIN WINDOW STARTED`);
    }

    // ============ STATE ============
    saveState() {
        const state = {
            pnl: this.pnl,
            pnlPercent: (this.pnl / 100) * 100,
            trades: this.trades.length,
            wins: this.trades.filter(t => t.pnl > 0).length,
            losses: this.trades.filter(t => t.pnl < 0).length,
            openPositions: this.positions.filter(p => p.status === 'OPEN').length,
            positions: this.positions,
            binanceData: this.binanceData,
            polymarketData: this.polymarketData,
            lastUpdate: new Date().toISOString()
        };
        
        // Save locally
        fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
        
        // Save to Upstash for Vercel
        saveToUpstash('aurora-terminal-state', state);
    }

    log(type, message) {
        const entry = `[${new Date().toISOString()}] [${type}] ${message}\n`;
        fs.appendFileSync(this.logFile, entry);
        
        // Save last 50 logs to Upstash
        try {
            const logs = fs.readFileSync(this.logFile, 'utf8').split('\n').filter(l => l.trim()).slice(-50);
            saveToUpstash('aurora-terminal-logs', logs);
        } catch {}
    }

    fetchJSON(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
                });
            }).on('error', reject);
        });
    }
}

// ============== RUN ==============
const terminal = new AuroraTerminal();
