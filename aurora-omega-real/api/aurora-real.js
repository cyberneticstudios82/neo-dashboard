// Vercel API Route - Aurora Real
// Uses Upstash for state storage

export default async function handler(req, res) {
    const UPSTASH_URL = "https://cute-lab-59871.upstash.io";
    const TOKEN = "AenfAAIncDJkNDgyMWZjZjcwOTA0NjYyOGQ1MDY3MTg4MDA5YmVlY3AyNTk4NzE";
    
    try {
        const url = `${UPSTASH_URL}/get/aurora-real-state`;
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${TOKEN}` }
        });
        
        const parsed = await response.json();
        
        if (parsed.result) {
            let data = typeof parsed.result === 'string' ? parsed.result : parsed.result.value;
            data = JSON.parse(data);
            
            // Try to get trade log from environment or return what we have
            data.recentLog = data.recentLog || [];
            
            return res.json(data);
        }
    } catch (e) {
        console.log('Upstash error:', e.message);
    }
    
    // Fallback
    res.json({ 
        bank: 100, 
        pnl: 0, 
        trades: 0, 
        wins: 0, 
        losses: 0, 
        openTrades: 0,
        message: "Bot may be offline"
    });
}
