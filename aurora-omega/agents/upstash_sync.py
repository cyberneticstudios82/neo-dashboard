#!/usr/bin/env python3
# Aurora Data Sync - Pushes bot data to Upstash Redis

import json
import time
import requests

# Upstash credentials
UPSTASH_URL = "https://cute-lab-59871.upstash.io"
TOKEN = "AenfAAIncDJkNDgyMWZjZjcwOTA0NjYyOGQ1MDY3MTg4MDA5YmVlY3AyNTk4NzE"

STATE_FILE = "/root/.openclaw/workspace/aurora-omega/logs/state.json"
HFT_FILE = "/root/.openclaw/workspace/aurora-omega/logs/hft_state.json"
TRADES_FILE = "/root/.openclaw/workspace/aurora-omega/logs/trades.json"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def push(key, data):
    """Push data to Upstash"""
    url = f"{UPSTASH_URL}/set/{key}"
    try:
        res = requests.post(url, headers=HEADERS, json=json.dumps(data), timeout=5)
        return res.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def push_json(key, data):
    """Push JSON data"""
    url = f"{UPSTASH_URL}/set/{key}"
    try:
        res = requests.post(url, headers=HEADERS, json=json.dumps(data), timeout=5)
        return res.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def sync():
    """Sync all bot data to Upstash"""
    try:
        # Read Aurora state
        with open(STATE_FILE) as f:
            aurora = json.load(f)
        
        # Read HFT state
        with open(HFT_FILE) as f:
            hft = json.load(f)
        
        # Read trades
        with open(TRADES_FILE) as f:
            trades = json.load(f)
        
        # Push to Upstash
        push_json("aurora", aurora)
        push_json("hft", hft)
        push_json("trades", trades[-20:])  # Last 20 trades
        
        print(f"✅ Synced: Aurora ${aurora.get('bank', 0):.2f}, HFT ${hft.get('bank', 0):.2f}")
        return True
    except Exception as e:
        print(f"❌ Sync error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Aurora Upstash Sync Started")
    while True:
        sync()
        time.sleep(10)  # Sync every 10 seconds
