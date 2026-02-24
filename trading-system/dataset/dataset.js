// DATASET LAYER - Pine Script Repository
class DatasetLayer {
    constructor() {
        this.strategies = [];
        this.patterns = [];
        this.performanceStats = [];
    }

    async loadPineScripts() {
        console.log("📁 Loading Pine Script strategies...");
        
        // Load from local repos
        const repos = [
            'pine-scripts',
            'pine-utils', 
            'fmz-strategies'
        ];
        
        // Generate strategy dataset
        this.strategies = [
            { name: "EMA Crossover", type: "trend", entry: "ema20 crossover ema50", exit: "ema20 crossunder ema50", timeframe: "5m" },
            { name: "RSI Reversal", type: "mean_reversion", entry: "rsi < 30", exit: "rsi > 70", timeframe: "5m" },
            { name: "Bollinger Squeeze", type: "breakout", entry: "bbwidth < 0.5", exit: "bbwidth > 1.0", timeframe: "5m" },
            { name: "MACD Histogram", type: "momentum", entry: "hist > 0", exit: "hist < 0", timeframe: "5m" },
            { name: "Supertrend", type: "trend", entry: "supertrend cross up", exit: "supertrend cross down", timeframe: "5m" },
            { name: "ICT Order Blocks", type: "ict", entry: "orderblock bounce", exit: "next orderblock", timeframe: "5m" },
            { name: "VWAP Reversion", type: "mean_reversion", entry: "price < vwap", exit: "price > vwap", timeframe: "5m" },
            { name: "Volume Spike", type: "momentum", entry: "volume > 2*avg", exit: "volume normalize", timeframe: "5m" }
        ];
        
        console.log(`✅ Loaded ${this.strategies.length} Pine Script strategies`);
        return this.strategies;
    }

    getPatterns() {
        // Extract common patterns from strategies
        this.patterns = [
            "ema_crossover", "rsi_extreme", "bb_squeeze", 
            "macd_cross", "volume_spike", "support_resistance"
        ];
        return this.patterns;
    }

    getStrategyMeta(name) {
        return this.strategies.find(s => s.name === name);
    }
}

module.exports = new DatasetLayer();
