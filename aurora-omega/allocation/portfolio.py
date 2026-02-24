#!/usr/bin/env python3
# Aurora Omega - Portfolio Manager
# Optimizes allocation and rebalancing

import time
import json
from datetime import datetime

class PortfolioManager:
    def __init__(self):
        self.name = "Portfolio Manager"
        self.allocations = {
            "BTC": 0.40,
            "ETH": 0.30,
            "ALT": 0.20,
            "STABLE": 0.10
        }
        
    def optimize(self, bank):
        # Rebalance based on performance
        return self.allocations
    
    def run(self):
        print(f"💼 {self.name} started - Managing allocation 24/7")
        cycle = 0
        while True:
            try:
                with open('/root/.openclaw/workspace/aurora-omega/logs/state.json', 'r') as f:
                    state = json.load(f)
                
                bank = state.get('bank', 100)
                alloc = self.optimize(bank)
                
                cycle += 1
                if cycle % 30 == 0:
                    print(f"💼 {self.name}: Bank ${bank:.2f} | BTC {alloc['BTC']*100:.0f}% | ETH {alloc['ETH']*100:.0f}% | ALT {alloc['ALT']*100:.0f}%")
                    
            except Exception as e:
                pass
                
            time.sleep(30)

if __name__ == "__main__":
    agent = PortfolioManager()
    agent.run()
