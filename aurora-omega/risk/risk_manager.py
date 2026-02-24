#!/usr/bin/env python3
# Aurora Omega - Risk Manager Agent
# Monitors risk metrics and portfolio health 24/7

import time
import json
from datetime import datetime

class RiskManager:
    def __init__(self):
        self.name = "Risk Manager"
        self.risk_threshold = 0.10  # 10% max daily loss
        self.position_limits = 0.05  # 5% max position
        self.alerts = []
        
    def check_risk(self, bank, trades):
        pnl_pct = (bank - 10000) / 10000
        if abs(pnl_pct) > self.risk_threshold:
            return {"alert": "DAILY_LOSS_LIMIT", "pnl": pnl_pct}
        return {"status": "OK", "pnl": pnl_pct}
    
    def run(self):
        print(f"⚖️ {self.name} started - Monitoring risk 24/7")
        cycle = 0
        while True:
            try:
                with open('/root/.openclaw/workspace/aurora-omega/logs/state.json', 'r') as f:
                    state = json.load(f)
                
                risk = self.check_risk(state.get('bank', 100), state.get('trades', 0))
                cycle += 1
                
                if cycle % 20 == 0:
                    print(f"⚖️ {self.name}: Bank ${state.get('bank', 0):.2f} | P&L: {risk.get('pnl', 0)*100:.2f}% | {risk.get('status', 'CHECK')}")
                
                if 'alert' in risk:
                    self.alerts.append({"time": datetime.now().isoformat(), "alert": risk})
                    print(f"⚠️ RISK ALERT: {risk}")
                    
            except Exception as e:
                pass
            
            time.sleep(30)

if __name__ == "__main__":
    agent = RiskManager()
    agent.run()
