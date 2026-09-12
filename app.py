from flask import Flask, render_template, request, jsonify
import requests
import json
from groq import Groq
import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

# --- API KEYS ---
WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
# Initialize Groq Client
client = Groq(api_key=GROQ_API_KEY)


# ----------------------------------------------------
# 1. SPECIALIZED SYSTEM PROMPTS FOR SERVICES
# ----------------------------------------------------
SERVICE_PROMPTS = {
    'general': "You are AtmosVision, an advanced meteorological AI assistant. Provide concise, accurate weather and climate insights. Use bolding for emphasis.",
    'srv-trip': "You are AtmosVision's Trip & Route Optimizer. Evaluate road hazards, severe weather risks, and safe transit corridors. Keep it to 2-3 short bullet points.",
    'srv-agri': "You are AtmosVision's Agri-Weather Intelligence agent. Provide brief agricultural forecasts covering soil moisture and pest risks based on weather. Keep it to 2-3 short bullet points.",
    'srv-event': "You are AtmosVision's Event Risk Management agent. Assess rain probabilities and wind gust risks for outdoor events. Keep it to 2-3 short bullet points.",
    'srv-aero': "You are AtmosVision's Aviation & Marine Advisor. Analyze cloud ceilings, visibility, and wind shear. Keep it to 2-3 short bullet points.",
    'srv-disaster': "You are AtmosVision's Disaster & Hazard Alert agent. Assess severe weather risks, geological hazards (like floods, melting glaciers, or storms), and provide urgent safety alerts and government-aligned guidelines for the user's location. Keep it to 2-3 short, highly readable bullet points."
}

# ----------------------------------------------------
# 2. ROUTES
# ----------------------------------------------------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_weather', methods=['POST'])
def get_weather():
    city = request.form.get('city')
    if not city:
        return jsonify({'error': 'City is required'}), 400

    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        return jsonify({
            'city': data['name'],
            'country': data['sys']['country'],
            'temperature': data['main']['temp'],
            'description': data['weather'][0]['description'].title(),
            'humidity': data['main']['humidity'],
            'wind_speed': data['wind']['speed']
        })
    return jsonify({'error': 'City not found or API error'}), 404

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    service_type = request.json.get('service', 'general')
    history = request.json.get('history', []) # Retrieves the past conversation
    
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400

    system_prompt = SERVICE_PROMPTS.get(service_type, SERVICE_PROMPTS['general'])

    # Build the message array with the system prompt first
    messages = [{"role": "system", "content": system_prompt}]
    
    # Loop through the history and inject previous context
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    # Add the brand new message at the very end
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model='openai/gpt-oss-120b',
            messages=messages
        )
        return jsonify({'reply': response.choices[0].message.content})
    except Exception as e:
        print(f"Chat AI Error: {e}")
        return jsonify({'reply': 'Sorry, I am having trouble connecting to meteorological servers right now.'}), 500

@app.route('/map_chat', methods=['POST'])
def map_chat():
    user_message = request.json.get('message')
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400
        
    system_instruction = """You are AtmosVision's Spatial & Weather Intelligence Agent.
Your sole purpose is to provide direct meteorological status, atmospheric conditions, and geographical positioning.
DO NOT provide travel recommendations, sightseeing ideas, packing advice, or tourist guides unless explicitly requested.

Focus your text_reply strictly on:
- Current Temperature & Atmospheric Conditions
- Humidity, Wind Speed, and Barometric overview
- Short-term precipitation & cloud cover outlook

You MUST output a valid JSON object containing exactly these keys:
"text_reply": string (Clean meteorological summary formatted in Markdown),
"update_map": boolean (Set to true when a city, region, or coordinates are referenced),
"target_lat": float (Accurate latitude of the requested location),
"target_lon": float (Accurate longitude of the requested location),
"zoom_level": integer (Standard city zoom 11 to 13),
"location_name": string (Official city or region name, e.g. 'Hyderabad, Telangana, India'),
"weather_type": string (Strictly one of: 'sunny', 'rainy', 'cloudy', 'snowy', 'windy', 'thunderstorm'),
"temperature": string (e.g. '29°C'),
"condition_summary": string (e.g. 'Thunderstorms & Rain')."""

    try:
        response = client.chat.completions.create(
            model='openai/gpt-oss-120b',
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Map AI Error: {e}")
        return jsonify({'error': 'Failed to process spatial data.'}), 500

if __name__ == '__main__':
    app.run(debug=True)