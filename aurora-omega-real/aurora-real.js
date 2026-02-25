// Aurora REAL Paper Trading System
// Uses real market conditions + technical analysis - NO SIMULATED OUTCOMES
// Paper money only, real execution logic

const fs = require('fs');
const https = require('https');
const http = require('http');

// ============== UPSTASH CONFIG ==============
const UPSTASH_URL = "https://cute-lab-59871.upstash.io";
const TOKEN = "AenfAAIncDJkNDgyMWZjZjcwOTA0NjYyOGQ1MDY3MTg4MDA5YmVlY3AyNTk4NzE";

async function saveToUpstash(key, data) {
    try {
        const url = `${UPSTASH_URL}/set/${key}`;
        await new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => resolve(d));
            });
            req.on('error', reject);
            // Save data directly, not wrapped
            req.write(JSON.stringify(data));
            req.end();
        });
    } catch (e) { console.log('Upstash save error:', e.message); }
}

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
                        // Result is a string containing JSON, need to parse it
                        if (parsed.result) {
                            resolve(typeof parsed.result === 'string' ? JSON.parse(parsed.result) : parsed.result);
                        } else {
                            resolve(null);
                        }
                    } catch(e) { resolve(null); }
                });
            }).on('error', reject);
        });
    } catch (e) { return null; }
}

// ============== CONFIG ==============
const CONFIG = {
    initialBank: 100,
    targetBank: 1000,
    maxRiskPerTrade: 0.10,      // 10% max per trade
    maxDailyTrades: 5,
    minConfidence: 0.6,
    
    // Use Binance API (higher rate limits than CoinGecko)
    binance: 'https://api.binance.com/api/v3',
    
    // Timeframes to analyze
    timeframes: ['1m', '5m', '15m', '1h', '4h', '1d'],
    
    // Learning
    learningRate: 0.1,
    minWinRateToIncreaseSize: 0.60,
    
    // Rate limiting
    minApiInterval: 10000,  // 10 seconds between API calls
    maxRetries: 3
};

class AuroraRealBot {
    constructor() {
        this.bank = CONFIG.initialBank;
        this.initialBank = CONFIG.initialBank;
        this.pnl = 0;
        this.pnlPercent = 0;
        this.trades = [];
        this.wins = 0;
        this.losses = 0;
        this.running = true;
        
        // Market data
        this.prices = {};
        this.ohlcv = {};
        this.orderBook = {};
        
        // Strategy performance tracking
        this.strategyStats = {
            'RSI_MOMENTUM': { wins: 0, losses: 0, total: 0 },
            'MACD_CROSS': { wins: 0, losses: 0, total: 0 },
            'EMA_TREND': { wins: 0, losses: 0, total: 0 },
            'BREAKOUT': { wins: 0, losses: 0, total: 0 },
            'SUPPORT_RESISTANCE': { wins: 0, losses: 0, total: 0 }
        };
        
        // Track what works
        this.bestStrategy = null;
        this.adaptiveSize = CONFIG.initialBank * CONFIG.maxRiskPerTrade;
        
        this.lastUpdate = new Date().toISOString();
        this.logFile = '/root/.openclaw/workspace/aurora-omega-real/trades.log';
        this.stateFile = '/root/.openclaw/workspace/aurora-omega-real/state.json';
        
        this.init();
    }

    init() {
        console.log('🚀 AURORA REAL PAPER TRADING');
        
        // Try to load state from Upstash FIRST
        this.loadStateFromUpstash().then(() => {
            console.log('💰 Bank: $' + this.bank.toFixed(2));
            console.log('📊 Trading with REAL conditions, REAL indicators');
            this.log('SYSTEM', 'Aurora Real resumed with $' + this.bank.toFixed(2));
        }).catch(() => {
            console.log('💰 Starting Bank: $' + this.initialBank);
            console.log('📊 Trading with REAL conditions, REAL indicators');
            this.log('SYSTEM', 'Aurora Real started with $' + this.initialBank);
        });
    }

    async loadStateFromUpstash() {
        const state = await loadFromUpstash('aurora-real-state');
        if (state && state.bank) {
            this.bank = state.bank;
            this.initialBank = state.initialBank || this.initialBank;
            this.pnl = state.pnl || 0;
            this.pnlPercent = state.pnlPercent || 0;
            this.trades = state.tradesList || [];  // Load actual trades array
            this.wins = state.wins || 0;
            this.losses = state.losses || 0;
            this.strategyStats = state.strategyStats || this.strategyStats;
            this.bestStrategy = state.bestStrategy || null;
            this.adaptiveSize = state.adaptiveSize || (this.initialBank * CONFIG.maxRiskPerTrade);
            console.log('✅ Loaded state from Upstash');
            return true;
        }
        return null;
    }

    // ============ REAL DATA FETCHING (BINANCE - HIGHER LIMITS) ============
    
    async fetchPrices() {
        // Use Binance API - much higher rate limits
        const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'PEPEUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT'];
        
        try {
            // Get all prices in one call
            const url = `${CONFIG.binance}/ticker/24hr?symbols=${JSON.stringify(pairs)}`;
            const data = await this.fetchJSON(url);
            
            if (Array.isArray(data)) {
                this.prices = {};
                data.forEach(ticker => {
                    const symbol = ticker.symbol.replace('USDT', '').toLowerCase();
                    this.prices[symbol] = {
                        usd: parseFloat(ticker.lastPrice),
                        usd_24h_change: parseFloat(ticker.priceChangePercent),
                        usd_24h_vol: parseFloat(ticker.volume)
                    };
                });
            }
            
            console.log('📈 Prices:', Object.keys(this.prices).map(k => `${k.toUpperCase()}: $${this.prices[k]?.usd?.toFixed(4)}`).join(', '));
            return this.prices;
        } catch (e) {
            console.log('❌ Price fetch error:', e.message);
            return this.prices;
        }
    }

    async fetchOHLCV(symbol, interval = '1h', limit = 100) {
        // Use Binance klines/candles API
        try {
            const pair = symbol.toUpperCase() + 'USDT';
            const url = `${CONFIG.binance}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
            const data = await this.fetchJSON(url);
            
            if (Array.isArray(data)) {
                this.ohlcv[symbol] = data.map(d => ({
                    time: d[0],
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                    volume: parseFloat(d[5])
                }));
            }
            
            return this.ohlcv[symbol] || [];
        } catch (e) {
            console.log(`❌ OHLCV fetch error for ${symbol}:`, e.message);
            return this.ohlcv[symbol] || [];
        }
    }

    async fetchOrderBook(symbol) {
        try {
            // Use Binance order book
            const pair = symbol.toUpperCase() + 'USDT';
            const url = `${CONFIG.binance}/depth?symbol=${pair}&limit=20`;
            const data = await this.fetchJSON(url);
            
            this.orderBook[symbol] = {
                bids: data.bids || [],
                asks: data.asks || [],
                spread: data.asks?.[0]?.[0] - data.bids?.[0]?.[0] || 0
            };
            
            return this.orderBook[symbol];
        } catch (e) {
            return this.orderBook[symbol] || {};
        }
    }

    // ============ TECHNICAL INDICATORS (REAL) ============
    
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        
        let gains = 0, losses = 0;
        for (let i = prices.length - period; i < prices.length; i++) {
            const change = prices[i].close - prices[i-1].close;
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateEMA(prices, period) {
        if (prices.length < period) return null;
        
        const k = 2 / (period + 1);
        let ema = prices[0].close;
        
        for (let i = 1; i < prices.length; i++) {
            ema = prices[i].close * k + ema * (1 - k);
        }
        
        return ema;
    }

    calculateMACD(prices) {
        if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
        
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12 - ema26;
        
        // Signal line (9-period EMA of MACD)
        const signal = macd * 0.9; // Simplified
        
        return {
            macd,
            signal,
            histogram: macd - signal
        };
    }

    calculateATR(prices, period = 14) {
        if (prices.length < period + 1) return 0;
        
        let atr = 0;
        for (let i = prices.length - period; i < prices.length; i++) {
            const tr = Math.max(
                prices[i].high - prices[i].low,
                Math.abs(prices[i].high - prices[i-1]?.close || 0),
                Math.abs(prices[i].low - prices[i-1]?.close || 0)
            );
            atr += tr;
        }
        
        return atr / period;
    }

    // ============ REAL TRADING STRATEGIES ============
    
    async analyzeAllStrategies(symbol, ohlcv) {
        if (!ohlcv || ohlcv.length < 30) return [];
        
        const signals = [];
        const prices = ohlcv;
        
        // 1. RSI Momentum Strategy
        const rsi = this.calculateRSI(prices);
        if (rsi < 30) {
            signals.push({
                strategy: 'RSI_MOMENTUM',
                direction: 'LONG',
                confidence: (30 - rsi) / 30,
                reason: `RSI oversold at ${rsi.toFixed(2)}`
            });
        } else if (rsi > 70) {
            signals.push({
                strategy: 'RSI_MOMENTUM',
                direction: 'SHORT',
                confidence: (rsi - 30) / 40,
                reason: `RSI overbought at ${rsi.toFixed(2)}`
            });
        }
        
        // 2. MACD Crossover
        const macd = this.calculateMACD(prices);
        if (macd.histogram > 0 && macd.histogram > macd.histogram * 0.1) {
            signals.push({
                strategy: 'MACD_CROSS',
                direction: 'LONG',
                confidence: Math.min(Math.abs(macd.histogram) / 10, 1),
                reason: 'MACD bullish crossover'
            });
        } else if (macd.histogram < 0) {
            signals.push({
                strategy: 'MACD_CROSS',
                direction: 'SHORT',
                confidence: Math.min(Math.abs(macd.histogram) / 10, 1),
                reason: 'MACD bearish crossover'
            });
        }
        
        // 3. EMA Trend Strategy
        const ema9 = this.calculateEMA(prices, 9);
        const ema21 = this.calculateEMA(prices, 21);
        if (ema9 && ema21) {
            if (ema9 > ema21 * 1.02) {
                signals.push({
                    strategy: 'EMA_TREND',
                    direction: 'LONG',
                    confidence: 0.7,
                    reason: 'EMA bullish trend (9 > 21)'
                });
            } else if (ema9 < ema21 * 0.98) {
                signals.push({
                    strategy: 'EMA_TREND',
                    direction: 'SHORT',
                    confidence: 0.7,
                    reason: 'EMA bearish trend (9 < 21)'
                });
            }
        }
        
        // 4. Support/Resistance Breakout
        const atr = this.calculateATR(prices);
        const currentPrice = prices[prices.length - 1].close;
        const high20 = Math.max(...prices.slice(-20).map(p => p.high));
        const low20 = Math.min(...prices.slice(-20).map(p => p.low));
        
        if (currentPrice > high20 + atr * 0.5) {
            signals.push({
                strategy: 'BREAKOUT',
                direction: 'LONG',
                confidence: 0.75,
                reason: 'Bullish breakout above 20-day high'
            });
        } else if (currentPrice < low20 - atr * 0.5) {
            signals.push({
                strategy: 'BREAKOUT',
                direction: 'SHORT',
                confidence: 0.75,
                reason: 'Bearish breakdown below 20-day low'
            });
        }
        
        // 5. Support/Resistance
        const support = low20 + atr * 0.5;
        const resistance = high20 - atr * 0.5;
        
        if (currentPrice < support + atr) {
            signals.push({
                strategy: 'SUPPORT_RESISTANCE',
                direction: 'LONG',
                confidence: 0.65,
                reason: 'Price near support'
            });
        } else if (currentPrice > resistance - atr) {
            signals.push({
                strategy: 'SUPPORT_RESISTANCE',
                direction: 'SHORT',
                confidence: 0.65,
                reason: 'Price near resistance'
            });
        }
        
        return signals;
    }

    // ============ ADAPTIVE POSITION SIZING ============
    
    calculatePositionSize(strategy) {
        const stats = this.strategyStats[strategy];
        if (!stats || stats.total < 3) {
            return this.adaptiveSize;
        }
        
        const winRate = stats.wins / stats.total;
        
        // Increase size if strategy performing well
        if (winRate >= CONFIG.minWinRateToIncreaseSize) {
            this.adaptiveSize = Math.min(this.adaptiveSize * 1.1, this.bank * 0.2);
        } else if (winRate < 0.4) {
            this.adaptiveSize = Math.max(this.adaptiveSize * 0.7, this.bank * 0.02);
        }
        
        return this.adaptiveSize;
    }

    // ============ EXECUTE REAL PAPER TRADE ============
    
    async executeTrade(signal, symbol, currentPrice) {
        const tradeSize = this.calculatePositionSize(signal.strategy);
        
        if (tradeSize < this.bank * 0.01) {
            console.log('⚠️ Bank too low for trade');
            return null;
        }
        
        const trade = {
            id: Date.now(),
            strategy: signal.strategy,
            direction: signal.direction,
            symbol: symbol,
            entryPrice: currentPrice,
            size: tradeSize,
            confidence: signal.confidence,
            reason: signal.reason,
            entryTime: new Date().toISOString(),
            status: 'OPEN',
            pnl: 0,
            pnlPercent: 0
        };
        
        this.trades.push(trade);
        
        this.log('TRADE', `OPEN: ${signal.direction} ${symbol} @ $${currentPrice} | Strategy: ${signal.strategy} | Size: $${tradeSize.toFixed(2)} | Reason: ${signal.reason}`);
        
        console.log(`\n✅ REAL TRADE OPENED:`);
        console.log(`   ${signal.direction} ${symbol} @ $${currentPrice}`);
        console.log(`   Strategy: ${signal.strategy} (${(signal.confidence * 100).toFixed(0)}% confidence)`);
        console.log(`   Size: $${tradeSize.toFixed(2)}`);
        
        return trade;
    }

    // ============ CLOSE TRADE (REAL CONDITIONS) ============
    
    async closeTrade(trade, exitPrice, reason) {
        const oldStatus = trade.status;
        
        // Calculate P&L based on REAL price movement
        if (trade.direction === 'LONG') {
            trade.pnl = (exitPrice - trade.entryPrice) / trade.entryPrice * trade.size;
        } else {
            trade.pnl = (trade.entryPrice - exitPrice) / trade.entryPrice * trade.size;
        }
        
        trade.pnlPercent = (trade.pnl / trade.size) * 100;
        trade.exitPrice = exitPrice;
        trade.exitTime = new Date().toISOString();
        trade.exitReason = reason;
        trade.status = 'CLOSED';
        
        // Update bank
        this.bank += trade.pnl;
        this.pnl = this.bank - this.initialBank;
        this.pnlPercent = (this.pnl / this.initialBank) * 100;
        
        // Update strategy stats
        const isWin = trade.pnl > 0;
        if (this.strategyStats[trade.strategy]) {
            if (isWin) {
                this.strategyStats[trade.strategy].wins++;
            } else {
                this.strategyStats[trade.strategy].losses++;
            }
            this.strategyStats[trade.strategy].total++;
        }
        
        // Update totals
        if (isWin) this.wins++;
        else this.losses++;
        
        this.log('TRADE', `CLOSED: ${trade.direction} ${trade.symbol} @ $${exitPrice} | P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%) | Reason: ${reason}`);
        
        console.log(`\n🔴 REAL TRADE CLOSED:`);
        console.log(`   ${trade.symbol} @ $${exitPrice}`);
        console.log(`   P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)`);
        console.log(`   Bank: $${this.bank.toFixed(2)}`);
        
        // Update best strategy
        this.updateBestStrategy();
        
        return trade;
    }

    updateBestStrategy() {
        let best = null;
        let bestWinRate = 0;
        
        for (const [strategy, stats] of Object.entries(this.strategyStats)) {
            if (stats.total >= 3) {
                const winRate = stats.wins / stats.total;
                if (winRate > bestWinRate) {
                    bestWinRate = winRate;
                    best = strategy;
                }
            }
        }
        
        this.bestStrategy = best;
        if (best) {
            console.log(`\n🎯 Best performing strategy: ${best} (${(bestWinRate * 100).toFixed(1)}% win rate)`);
        }
    }

    // ============ MAIN TRADING CYCLE ============
    
    async runCycle() {
        console.log('\n' + '='.repeat(50));
        console.log('🔄 AURORA REAL TRADING CYCLE - ' + new Date().toISOString());
        console.log('='.repeat(50));
        
        // Fetch real prices
        await this.fetchPrices();
        
        // Get top liquid assets (Binance pairs)
        const symbols = ['btc', 'eth', 'sol', 'doge', 'pepe', 'bnb', 'ada', 'dot'];
        
        for (const symbol of symbols) {
            const price = this.prices[symbol]?.usd;
            if (!price) continue;
            
            // Get OHLCV data for analysis (1 hour candles, last 100)
            const ohlcv = await this.fetchOHLCV(symbol, '1h', 100);
            
            // Analyze with all strategies
            const signals = await this.analyzeAllStrategies(symbol, ohlcv);
            
            if (signals.length === 0) continue;
            
            // Get highest confidence signal
            const bestSignal = signals.reduce((a, b) => a.confidence > b.confidence ? a : b);
            
            // Check if we should trade
            if (bestSignal.confidence >= CONFIG.minConfidence) {
                // Ensure trades is an array
                if (!Array.isArray(this.trades)) this.trades = [];
                
                // Check if we already have open trade for this symbol
                const openTrades = this.trades.filter(t => t.symbol === symbol && t.status === 'OPEN');
                
                if (openTrades.length === 0) {
                    // Open new trade
                    await this.executeTrade(bestSignal, symbol, price);
                } else {
                    // Check if we should close existing trade
                    for (const trade of openTrades) {
                        const pnlPercent = trade.direction === 'LONG' 
                            ? (price - trade.entryPrice) / trade.entryPrice * 100
                            : (trade.entryPrice - price) / trade.entryPrice * 100;
                        
                        // Take profit at 5% or stop loss at 2%
                        if (pnlPercent >= 5) {
                            await this.closeTrade(trade, price, 'Take profit +5%');
                        } else if (pnlPercent <= -2) {
                            await this.closeTrade(trade, price, 'Stop loss -2%');
                        }
                    }
                }
            }
        }
        
        // Close any trades that have been open for more than 24 hours
        const now = Date.now();
        for (const trade of this.trades.filter(t => t.status === 'OPEN')) {
            const hoursOpen = (now - new Date(trade.entryTime).getTime()) / (1000 * 60 * 60);
            if (hoursOpen > 24) {
                const symbol = trade.symbol;
                const price = this.prices[symbol]?.usd;
                if (price) {
                    await this.closeTrade(trade, price, 'Time exit (24h)');
                }
            }
        }
        
        this.lastUpdate = new Date().toISOString();
        this.saveState();
        this.printStatus();
        
        return this.getState();
    }

    // ============ UTILITIES ============
    
    printStatus() {
        console.log('\n' + '-'.repeat(40));
        console.log('📊 AURORA REAL STATUS:');
        console.log(`   Bank: $${this.bank.toFixed(2)}`);
        console.log(`   P&L: $${this.pnl.toFixed(2)} (${this.pnlPercent.toFixed(2)}%)`);
        console.log(`   Total Trades: ${this.wins + this.losses}`);
        console.log(`   Win Rate: ${this.wins + this.losses > 0 ? ((this.wins / (this.wins + this.losses)) * 100).toFixed(1) : 0}%`);
        console.log(`   Open Trades: ${this.trades.filter(t => t.status === 'OPEN').length}`);
        console.log(`   Best Strategy: ${this.bestStrategy || 'N/A'}`);
        
        console.log('\n📈 Strategy Performance:');
        for (const [strategy, stats] of Object.entries(this.strategyStats)) {
            if (stats.total > 0) {
                const wr = ((stats.wins / stats.total) * 100).toFixed(1);
                console.log(`   ${strategy}: ${stats.wins}W/${stats.losses}L (${wr}%)`);
            }
        }
        console.log('-'.repeat(40));
    }

    getState() {
        return {
            bank: this.bank,
            pnl: this.pnl,
            pnlPercent: this.pnlPercent,
            trades: this.wins + this.losses,  // Total count
            wins: this.wins,
            losses: this.losses,
            winRate: this.wins + this.losses > 0 ? ((this.wins / (this.wins + this.losses)) * 100).toFixed(1) : 0,
            openTrades: Array.isArray(this.trades) ? this.trades.filter(t => t.status === 'OPEN').length : 0,
            bestStrategy: this.bestStrategy,
            strategyStats: this.strategyStats,
            lastUpdate: this.lastUpdate,
            prices: this.prices,
            // Include actual trades array
            tradesList: Array.isArray(this.trades) ? this.trades : []
        };
    }

    saveState() {
        const state = this.getState();
        // Save locally
        fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
        // Save to Upstash for Vercel API
        saveToUpstash('aurora-real-state', state);
    }

    log(type, message) {
        const entry = `[${new Date().toISOString()}] [${type}] ${message}\n`;
        fs.appendFileSync(this.logFile, entry);
    }

    fetchJSON(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            client.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });
    }
}

// ============== RUN ==============
const bot = new AuroraRealBot();

// US Market Hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
// Focus trading during US session for best liquidity
function isUSMarketHours() {
    const utc = new Date();
    const hour = utc.getUTCHours();
    // Active: 14:00 UTC (9AM EST) to 21:00 UTC (4PM EST)
    return hour >= 14 && hour < 21;
}

// Wait for init to load state, then run cycles
setTimeout(() => {
    bot.runCycle().then(() => {
        // Run every 5 minutes but only during US hours
        setInterval(() => {
            if (isUSMarketHours()) {
                console.log('🟢 US Market Open - Trading Active');
                bot.runCycle();
            } else {
                console.log('🔴 US Market Closed - Sleep Mode');
            }
        }, 5 * 60 * 1000); // 5 minutes
    });
}, 2000); // Wait 2 seconds for init to complete
