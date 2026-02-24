#!/usr/bin/env python3
"""
ASTRA WhatsApp Scheduler
Sends health updates and reminders via WhatsApp
"""

import json
import time
import os
from datetime import datetime, timedelta
import random

# User profile
PROFILE = {
    "name": "Pankaj",
    "medicines": [
        {"name": "Glimepiride", "time": "13:00"},
        {"name": "Rosuvastatin", "time": "21:00"}
    ],
    "equipment": ["treadmill", "resistance bands", "dumbbells", "bench"]
}

def get_morning_msg():
    msgs = [
        f"Good morning {PROFILE['name']}! 🌅 Your body is ready. Today is a great day for progress.",
        f"Rise and shine {PROFILE['name']}! 🚀 The universe supports your journey today.",
        f"Good morning champion! ✨ Today brings new opportunities for growth."
    ]
    return random.choice(msgs)

def get_workout_msg():
    workouts = [
        "Treadmill: 20 min incline walk @ 3mph",
        "Goblet Squats: 4x12 @ 25lbs",
        "Resistance Band Rows: 4x15",
        "Dumbbell Bench: 4x10",
        "Plank: 3x45 sec"
    ]
    return "🏋️ Today's Workout:\n" + "\n".join([f"• {w}" for w in workouts[:4]])

def get_medicine_msg():
    msg = "💊 Medicine Reminders:\n"
    for med in PROFILE['medicines']:
        msg += f"• {med['name']}: {med['time']}\n"
    return msg

def get_checkin_msg():
    hour = datetime.now().hour
    if 6 <= hour < 12:
        return f"Hey {PROFILE['name']}! How's your morning? Stay consistent!"
    elif 12 <= hour < 17:
        return f"{PROFILE['name']}! Stay focused. You've got this! 💪"
    elif 17 <= hour < 21:
        return f"Good evening {PROFILE['name']}! How was your day?"
    else:
        return f"Night {PROFILE['name']}. Rest is training too. 💤"

def get_health_tip():
    tips = [
        "Drink 3L water today. Hydration = performance.",
        "Oats & nuts help lower cholesterol naturally.",
        "30 min walk after meals improves insulin sensitivity.",
        "Sleep before midnight for optimal recovery.",
        "Protein within 30 min post-workout = muscle growth.",
        "Vitamin D + K2 supports heart health."
    ]
    return f"💡 {random.choice(tips)}"

def get_astro_insight():
    day = datetime.now().weekday()
    insights = {
        0: "Monday - Day of action. High energy!",
        1: "Tuesday - Mental clarity peaks.",
        2: "Wednesday - Recovery day. Light training.",
        3: "Thursday - High productivity. Push hard!",
        4: "Friday - Transition. Moderate intensity.",
        5: "Saturday - Social energy. Go longer!",
        6: "Sunday - Rest & reflection."
    }
    return f"✨ {insights[day]}"

# Message templates by time
SCHEDULE = {
    "07:00": [get_morning_msg, get_workout_msg],
    "09:00": [get_health_tip],
    "13:00": ["💊 Time for Glimepiride!"],
    "15:00": [get_checkin_msg],
    "18:00": [get_workout_msg],
    "21:00": ["💊 Time for Rosuvastatin!"],
    "21:30": [get_health_tip],
    "22:00": [get_astro_insight]
}

def get_next_message():
    now = datetime.now()
    current_time = now.strftime("%H:%M")
    current_hour = now.hour
    
    # Check exact time matches
    if current_time in SCHEDULE:
        msgs = []
        for func in SCHEDULE[current_time]:
            msgs.append(func())
        return "\n\n".join(msgs)
    
    # 30-minute check-ins
    if current_hour in [10, 11, 14, 16, 19, 20]:
        return get_checkin_msg()
    
    return None

def main():
    print("📱 ASTRA WhatsApp Scheduler started")
    print(f"⏰ Current time: {datetime.now().strftime('%H:%M:%S')}")
    print("\n📅 Schedule:")
    for time, funcs in SCHEDULE.items():
        print(f"  {time}: {len(funcs)} message(s)")
    
    while True:
        msg = get_next_message()
        if msg:
            print(f"\n🕐 {datetime.now().strftime('%H:%M:%S')}")
            print("📤 Message ready:")
            print(msg)
            print("\n⚠️ Use OpenClaw message tool to send to WhatsApp")
            # In production, integrate with OpenClaw message API here
        
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()
