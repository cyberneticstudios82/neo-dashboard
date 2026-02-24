#!/usr/bin/env python3
"""
ASTRA - Adaptive Support, Training, Reflection, and Awareness
Personal Health Companion Agent
"""

import json
import time
import os
from datetime import datetime, timedelta
import random

class Astra:
    def __init__(self):
        self.name = "Pankaj"
        self.profile = self.load_profile()
        self.last_workout = None
        self.last_checkin = None
        self.habit_streak = 0
        print("✨ ASTRA initialized for", self.name)
    
    def load_profile(self):
        profile = {
            "name": "Pankaj",
            "conditions": ["Type 2 Diabetes", "High Cholesterol"],
            "medicines": [
                {"name": "Glimepiride", "time": "13:00", "taken": False},
                {"name": "Rosuvastatin", "time": "21:00", "taken": False}
            ],
            "equipment": ["treadmill", "resistance bands", "adjustable dumbbells", "weight bench"],
            "goals": ["reduce fat", "reduce cholesterol", "increase muscle"],
            "sleep": "11pm-7am",
            "wake_time": "07:00",
            "sleep_time": "23:00"
        }
        return profile
    
    def get_astro_insight(self):
        day = datetime.utcnow().weekday()
        insights = {
            0: "Monday - Day of action. Energy is high. Perfect for intense workouts.",
            1: "Tuesday - Mental clarity peaks. Good for learning new exercises.",
            2: "Wednesday - Mid-week focus. Recovery day. Light training.",
            3: "Thursday - High productivity. Push hard in training.",
            4: "Friday - Transition day. Moderate intensity.",
            5: "Saturday - Social energy. Great for longer sessions.",
            6: "Sunday - Rest and reflection. Recovery focus."
        }
        return insights[day]
    
    def generate_workout(self):
        workouts = {
            "fat_loss": [
                "Treadmill: 20 min incline walk @ 3mph, 15% incline",
                "Goblet Squats: 4x12 @ 25lbs",
                "Resistance Band Pull-aparts: 4x15",
                "Plank: 3x45 seconds",
                "Dumbbell Rows: 3x12 each arm"
            ],
            "muscle_gain": [
                "Bench Press: 4x8 @ heaviest available",
                "Incline Dumbbell Press: 3x10",
                "Dumbbell Curls: 3x12",
                "Tricep Dips: 3x12",
                "Cable Flys: 3x12"
            ],
            "hybrid": [
                "Treadmill: 15 min intervals (1min fast, 1min walk)",
                "Dumbbell Bench: 4x10",
                "Bent Over Rows: 4x10",
                "Shoulder Press: 3x10",
                "Plank: 3x60 seconds"
            ]
        }
        
        focus = random.choice(["fat_loss", "muscle_gain", "hybrid"])
        routine = workouts[focus]
        
        return {
            "focus": focus.replace("_", " ").title(),
            "exercises": routine
        }
    
    def generate_morning_message(self):
        msgs = [
            f"Good morning {self.name}! 🌅 Your body is ready. Today is a great day for progress.",
            f"Rise and shine {self.name}! 🚀 The universe supports your journey today.",
            f"Good morning champion! ✨ Today brings new opportunities for growth.",
            f"Wake up {self.name}! 🌞 Your dedication will be rewarded today."
        ]
        return random.choice(msgs)
    
    def generate_checkin(self):
        hour = datetime.utcnow().hour
        if 6 <= hour < 12:
            return f"Hey {self.name}! How's your morning? Remember: small steps lead to big changes. Stay consistent!"
        elif 12 <= hour < 17:
            return f"{self.name}! Stay focused. You've come far. Keep going! 💪"
        elif 17 <= hour < 21:
            return f"Good evening {self.name}! How was your day? Don't forget your workout window."
        else:
            return f"Night {self.name}. Reflect on today's wins. Sleep is your superpower. 💤"
    
    def get_health_tip(self):
        tips = [
            "Drink 3L water today. Hydration = performance.",
            "High cholesterol? Oats, nuts, and fish are your friends.",
            "Sleep before midnight for optimal recovery.",
            "30 min walk after meals helps insulin sensitivity.",
            "Stress raises cortisol - practice deep breathing.",
            "Protein within 30 min post-workout maximizes muscle growth.",
            "Vitamin D + K2 for heart health with your statins."
        ]
        return random.choice(tips)

# Message generator for OpenClaw
def get_message():
    astra = Astra()
    messages = []
    
    # Morning
    messages.append(astra.generate_morning_message())
    
    # Workout
    workout = astra.generate_workout()
    workout_msg = f"🏋️ Today's Workout ({workout['focus']}):\n"
    for ex in workout['exercises']:
        workout_msg += f"• {ex}\n"
    messages.append(workout_msg)
    
    # Medicines
    messages.append("💊 Medicine Reminders:\n• Glimepiride: 1:00 PM\n• Rosuvastatin: 9:00 PM")
    
    # Astro
    messages.append(f"✨ Astro Insight: {astra.get_astro_insight()}")
    
    # Health tip
    messages.append(f"💡 Health Tip: {astra.get_health_tip()}")
    
    return "\n\n".join(messages)

if __name__ == "__main__":
    print(get_message())
