#!/usr/bin/env python3
# Aurora Data Sync - Pushes trading state to free JSON store
# Uses a simple approach: writes to local files that can be served

import json
import time
import os

STATE_FILE = '/root/.openclaw/workspace/aurora-omega/logs/state.json'
HFT_STATE_FILE = '/root/.openclaw/workspace/aurora-omega/logs/hft_state.json'
TRADES_FILE = '/root/.openclaw/workspace/aurora-omega/logs/trades.json'

# Combined state for API
COMBINED_FILE = '/tmp/aurora_combined.json'

def sync():
    """Sync all trading data to combined file for API to serve"""
    try:
        # Read Aurora state
        with open(STATE_FILE, 'r') as f:
            aurora = json.load(f)
        
        # Read HFT state  
        with open(HFT_STATE_FILE, 'r') as f:
            hft = json.load(f)
        
        # Read trades
        with open(TRADES_FILE, 'r') as f:
            trades = json.load(f)
        
        # Combine
        combined = {
            'aurora': aurora,
            'hft': hft,
            'trades': trades[-20:],  # Last 20 trades
            'updated': time.time()
        }
        
        # Write for API
        with open(COMBINED_FILE, 'w') as f:
            json.dump(combined, f)
        
        print(f"✅ Synced: Aurora ${aurora.get('bank', 0):.2f}, HFT ${hft.get('bank', 0):.2f}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    while True:
        sync()
        time.sleep(10)  # Sync every 10 seconds
