// MONITORING LAYER - Performance tracker & Risk controller
class MonitoringLayer {
    constructor() {
        this.stats = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalPnl: 0,
            maxDrawdown: 0,
            sharpeRatio: 0
        };
        this.riskLimits = {
            maxPositionSize: 0.1, // 10% of bank
            maxDailyLoss: 0.2,   // 20% max daily loss
            stopLoss: 0.02       // 2% stop loss
        };
    }

    trackTrade(result) {
        this.stats.totalTrades++;
        if (result.profit > 0) {
            this.stats.winningTrades++;
        } else {
            this.stats.losingTrades++;
        }
        this.stats.totalPnl += result.profit;
        
        console.log(`\n📊 Performance:`);
        console.log(`   Trades: ${this.stats.totalTrades}`);
        console.log(`   Win Rate: ${this.getWinRate()}%`);
        console.log(`   P&L: $${this.stats.totalPnl.toFixed(2)}`);
    }

    getWinRate() {
        if (this.stats.totalTrades === 0) return 0;
        return (this.stats.winningTrades / this.stats.totalTrades * 100).toFixed(1);
    }

    checkRisk(bank, tradeSize) {
        // Check if trade exceeds risk limits
        if (tradeSize > bank * this.riskLimits.maxPositionSize) {
            console.log("⚠️ Risk limit: Position size too large");
            return false;
        }
        return true;
    }

    getStats() {
        return {
            ...this.stats,
            winRate: this.getWinRate(),
            riskLimits: this.riskLimits
        };
    }
}

module.exports = new MonitoringLayer();
