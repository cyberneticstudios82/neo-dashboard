#!/usr/bin/env python3
"""
Polymarket Trading Dashboard - Aurora Omega
Real-time trading with Polymarket API
"""
import streamlit as st
import pandas as pd
import requests
import json
import os
from datetime import datetime

# Configuration
POLYMARKET_CLOB_URL = "https://clob.polymarket.com"
GAMMA_API_URL = "https://gamma-api.polymarket.com/marks"

st.set_page_config(page_title="Aurora - Polymarket", layout="wide")

# Custom CSS
st.markdown("""
<style>
    .stApp { background: #030508; }
    .metric-box { background: rgba(10,20,40,0.9); padding: 20px; border-radius: 10px; border: 1px solid rgba(0,245,255,0.2); }
    .trade-item { padding: 10px; margin: 5px 0; background: rgba(0,0,0,0.3); border-left: 3px solid #00f5ff; border-radius: 5px; }
    .trade-win { border-left-color: #00ff88; }
    .trade-loss { border-left-color: #ff3366; }
</style>
""", unsafe_allow_html=True)

# Session state
if 'virtual_balance' not in st.session_state:
    st.session_state.virtual_balance = 100.0
if 'positions' not in st.session_state:
    st.session_state.positions = {}
if 'trade_history' not in st.session_state:
    st.session_state.trade_history = []

# Fetch markets
@st.cache_data(ttl=30)
def fetch_markets():
    try:
        response = requests.get(GAMMA_API_URL, params={"active": "true"}, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        st.error(f"Error fetching markets: {e}")
    return []

# Fetch prices
def get_prices():
    markets = fetch_markets()
    if markets:
        return markets[:20]  # Top 20
    return []

# Main dashboard
st.title("◆ AURORA - Polymarket Trading")

# Sidebar
st.sidebar.header("⚙️ Configuration")
mode = st.sidebar.selectbox("Mode", ["Paper Trading", "Live Trading"], index=0)
st.sidebar.markdown("---")
st.sidebar.header("📊 Bot Stats")

# Load Aurora stats
try:
    with open('/root/.openclaw/workspace/aurora-omega/logs/state.json') as f:
        aurora = json.load(f)
    with open('/root/.openclaw/workspace/aurora-omega/logs/hft_state.json') as f:
        hft = json.load(f)
    
    total_bank = aurora.get('bank', 100) + hft.get('bank', 100)
    total_pnl = aurora.get('pnl', 0) + hft.get('pnl', 0)
    
    st.sidebar.metric("Aurora Bank", f"${aurora.get('bank', 100):.2f}", f"{aurora.get('pnl', 0):+.2f}")
    st.sidebar.metric("HFT Bank", f"${hft.get('bank', 100):.2f}", f"{hft.get('pnl', 0):+.2f}")
    st.sidebar.metric("Total", f"${total_bank:.2f}", f"{total_pnl:+.2f}")
except:
    st.sidebar.write("Bots offline")

# Top stats row
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Virtual Balance", f"${st.session_state.virtual_balance:.2f}")
with col2:
    total_trades = len(st.session_state.trade_history)
    wins = sum(1 for t in st.session_state.trade_history if t.get('profit', 0) > 0)
    st.metric("Total Trades", total_trades)
with col3:
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    st.metric("Win Rate", f"{win_rate:.1f}%")
with col4:
    pnl = sum(t.get('profit', 0) for t in st.session_state.trade_history)
    st.metric("P&L", f"${pnl:+.2f}", delta_color="normal")

# Markets section
st.header("🎯 Active Markets")
markets = get_prices()

if markets:
    # Create DataFrame
    market_data = []
    for m in markets:
        try:
            tokens = m.get('tokens', [])
            yes_price = float(tokens[0].get('price', 0)) if len(tokens) > 0 else 0
            no_price = float(tokens[1].get('price', 0)) if len(tokens) > 1 else 0
            market_data.append({
                'Question': m.get('question', 'N/A')[:50],
                'Yes': f"${yes_price:.2f}",
                'No': f"${no_price:.2f}",
                'Volume': f"${m.get('volume', 0):,.0f}",
                'Slug': m.get('slug', '')
            })
        except:
            pass
    
    df = pd.DataFrame(market_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    # Trading section
    st.header("💰 Place Trade")
    col1, col2 = st.columns(2)
    
    with col1:
        selected = st.selectbox("Select Market", df['Question'].tolist())
        market_slug = df[df['Question'] == selected]['Slug'].iloc[0] if selected else None
        
    if selected:
        # Find market details
        market = next((m for m in markets if m.get('question', '').startswith(selected)), None)
        if market:
            tokens = market.get('tokens', [])
            yes_price = float(tokens[0].get('price', 0)) if tokens else 0
            no_price = float(tokens[1].get('price', 0)) if len(tokens) > 1 else 0
            
            col_a, col_b = st.columns(2)
            with col_a:
                st.write(f"**Yes:** ${yes_price:.2f}")
                amount_yes = st.number_input("USDC for Yes", min_value=1.0, value=10.0, key="yes_amt")
                if st.button("Buy YES", use_container_width=True):
                    # Simulate trade
                    shares = amount_yes / yes_price
                    profit = (shares * yes_price - amount_yes) if yes_price > 0.5 else -amount_yes * 0.1
                    st.session_state.virtual_balance -= amount_yes
                    st.session_state.trade_history.append({
                        'time': datetime.now().isoformat(),
                        'market': selected[:30],
                        'side': 'BUY',
                        'token': 'YES',
                        'amount': amount_yes,
                        'price': yes_price,
                        'profit': profit,
                        'result': 'WIN' if profit > 0 else 'LOSS'
                    })
                    st.success(f"Bought ${amount_yes} YES at ${yes_price:.2f}")
            
            with col_b:
                st.write(f"**No:** ${no_price:.2f}")
                amount_no = st.number_input("USDC for No", min_value=1.0, value=10.0, key="no_amt")
                if st.button("Buy NO", use_container_width=True):
                    shares = amount_no / no_price
                    profit = (shares * no_price - amount_no) if no_price > 0.5 else -amount_no * 0.1
                    st.session_state.virtual_balance -= amount_no
                    st.session_state.trade_history.append({
                        'time': datetime.now().isoformat(),
                        'market': selected[:30],
                        'side': 'BUY',
                        'token': 'NO',
                        'amount': amount_no,
                        'price': no_price,
                        'profit': profit,
                        'result': 'WIN' if profit > 0 else 'LOSS'
                    })
                    st.success(f"Bought ${amount_no} NO at ${no_price:.2f}")

# Trade history
st.header("📜 Trade History")
if st.session_state.trade_history:
    history_df = pd.DataFrame(st.session_state.trade_history)
    st.dataframe(history_df, use_container_width=True)
else:
    st.info("No trades yet. Select a market above to start trading.")

# Footer
st.markdown("---")
st.caption("Aurora Omega - Polymarket Dashboard | Paper Trading Mode")
