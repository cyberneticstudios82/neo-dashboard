// APEX TRADING SYSTEM - Full Architecture
const Dataset = require('./dataset/dataset');
const Training = require('./training/training');
const Execution = require('./execution/execution');
const Monitor = require('./monitoring/monitor');

class ApexTradingSystem {
    constructor() {
        this.dataset = Dataset;
        this.training = Training;
        this.execution = Execution;
        this.monitor = Monitor;
        this.isRunning = false;
    }

    async initialize() {
        console.log("=".repeat(60));
        console.log("🤖 APEX TRADING SYSTEM");
        console.log("=".repeat(60));

        // Layer 1: Dataset
        console.log("\n📁 DATASET LAYER");
        await this.dataset.loadPineScripts();
        const patterns = this.dataset.getPatterns();
        console.log(`   Patterns: ${patterns.join(', ')}`);

        // Layer 2: Training
        console.log("\n🧠 TRAINING LAYER");
        await this.training.train(this.dataset.strategies);

        // Layer 3: Execution
        console.log("\n🎯 EXECUTION LAYER");
        this.execution.setWebhook('https://your-tradingview-webhook');

        // Layer 4: Monitoring
        console.log("\n📊 MONITORING LAYER");
        console.log(`   Risk: Max ${this.monitor.riskLimits.maxPositionSize * 100}% per trade`);

        this.isRunning = true;
        console.log("\n✅ System ready!\n");
    }

    async trade(prices) {
        // Extract patterns
        const patterns = this.training.extractPatterns(prices);
        
        // Generate signal
        const signal = this.training.generateSignal(patterns);
        
        if (signal && this.monitor.checkRisk(100, 10)) {
            const result = await this.execution.executeTrade(signal, prices[prices.length-1], 10);
            this.monitor.trackTrade(result);
        }

        return signal;
    }
}

module.exports = ApexTradingSystem;
