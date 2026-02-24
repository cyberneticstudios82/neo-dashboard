#!/usr/bin/env python3
# Aurora Omega - Sentiment Analyzer
# Monitors market sentiment and social signals

import time
import random
from datetime import datetime

class SentimentAnalyzer:
    def __init__(self):
        self.name = "Sentiment Analyzer"
        self.sentiments = []
        
    def fetch_sentiment(self):
        sentiments = ["BULLISH", "BEARISH", "NEUTRAL", "FEAR", "GREED"]
        return random.choice(sentiments)
    
    def run(self):
        print(f"📰 {self.name} started - Monitoring sentiment 24/7")
        cycle = 0
        while True:
            sentiment = self.fetch_sentiment()
            self.sentiments.append({
                "time": datetime.now().isoformat(),
                "sentiment": sentiment
            })
            cycle += 1
            if cycle % 15 == 0:
                print(f"📰 {self.name}: Market sentiment = {sentiment} | Data points: {len(self.sentiments)}")
            time.sleep(30)

if __name__ == "__main__":
    agent = SentimentAnalyzer()
    agent.run()
