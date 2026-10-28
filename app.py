import os
import random
import requests
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "pro_admin_portal_secret_2026")

TELEGRAM_BOT_TOKEN = "9140076102:AAHuSIGr7B9c1YEzg5PBQn06A4eXM4p7UHI"

users_db = {}
verification_codes = {}
deposit_requests = []
withdraw_requests = []

admin_forecast = {
    "swamp": "auto",
    "aviator": "auto"
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/send_code", methods=["POST"])
def send_code():
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    chat_id = data.get("chat_id", "").strip()

    if not phone:
        return jsonify({"success": False, "message": "Telefon raqam kiritilmadi!"}), 400

    code = str(random.randint(100000, 999900))
    verification_codes[phone] = code

    if chat_id and TELEGRAM_BOT_TOKEN != "SIZNING_TELEGRAM_BOT_TOKENINGIZ":
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": f"🔐 VIP Game Portal tasdiqlash kodingiz: *{code}*",
            "parse_mode": "Markdown"
        }
        try:
            requests.post(url, json=payload)
        except Exception:
            pass

    return jsonify({"success": True, "message": "Kod yuborildi!", "debug_code": code})

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    password = data.get("password", "").strip()
    code = data.get("code", "").strip()

    if verification_codes.get(phone) != code:
        return jsonify({"success": False, "message": "Tasdiqlash kodi noto'g'ri!"}), 400

    if phone in users_db:
        return jsonify({"success": False, "message": "Bu raqam band!"}), 400

    user_id = str(random.randint(100000, 999999))
    users_db[phone] = {
        "user_id": user_id,
        "phone": phone,
        "password": generate_password_hash(password),
        "balance": 5000.0,  # Yangi kirgan odamlarga 5,000 UZS bonus!
        "is_admin": (phone == "+998930713008") # O'z raqamingizni yozing
    }

    session["user_phone"] = phone
    return jsonify({
        "success": True, 
        "user": {
            "id": user_id, 
            "phone": phone, 
            "balance": users_db[phone]["balance"], 
            "is_admin": users_db[phone]["is_admin"]
        }
    })

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    password = data.get("password", "").strip()

    user = users_db.get(phone)
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"success": False, "message": "Telefon yoki parol xato!"}), 400

    session["user_phone"] = phone
    return jsonify({
        "success": True, 
        "user": {
            "id": user["user_id"], 
            "phone": user["phone"], 
            "balance": user["balance"], 
            "is_admin": user.get("is_admin", False)
        }
    })

@app.route("/api/me", methods=["GET"])
def me():
    phone = session.get("user_phone")
    if not phone or phone not in users_db:
        return jsonify({"authenticated": False}), 401
    user = users_db[phone]
    return jsonify({
        "authenticated": True, 
        "user": {
            "id": user["user_id"], 
            "phone": user["phone"], 
            "balance": user["balance"], 
            "is_admin": user.get("is_admin", False)
        }
    })

@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop("user_phone", None)
    return jsonify({"success": True})

@app.route("/api/deposit_request", methods=["POST"])
def deposit_request():
    phone = session.get("user_phone")
    if not phone or phone not in users_db:
        return jsonify({"success": False}), 401
    data = request.get_json() or {}
    amount = float(data.get("amount", 0))
    card = data.get("card", "")

    req_id = random.randint(1000, 9999)
    deposit_requests.append({"id": req_id, "phone": phone, "amount": amount, "card": card, "status": "Kutilmoqda"})
    return jsonify({"success": True, "message": "Pul to'ldirish so'rovi adminga yuborildi!"})

@app.route("/api/withdraw_request", methods=["POST"])
def withdraw_request():
    phone = session.get("user_phone")
    if not phone or phone not in users_db:
        return jsonify({"success": False}), 401
    data = request.get_json() or {}
    amount = float(data.get("amount", 0))
    card = data.get("card", "")

    user = users_db[phone]
    if user["balance"] < amount:
        return jsonify({"success": False, "message": "Balansda mablag' yetarli emas!"}), 400

    user["balance"] -= amount
    req_id = random.randint(1000, 9999)
    withdraw_requests.append({"id": req_id, "phone": phone, "amount": amount, "card": card, "status": "Kutilmoqda"})
    return jsonify({"success": True, "message": "Pul yechish so'rovi qabul qilindi!"})

@app.route("/api/update_balance", methods=["POST"])
def update_balance():
    phone = session.get("user_phone")
    if not phone or phone not in users_db:
        return jsonify({"success": False}), 401
    data = request.get_json() or {}
    amt = float(data.get("amount", 0))
    users_db[phone]["balance"] += amt
    if users_db[phone]["balance"] < 0: users_db[phone]["balance"] = 0.0
    return jsonify({"success": True, "new_balance": users_db[phone]["balance"]})

@app.route("/api/admin/data", methods=["GET"])
def admin_data():
    phone = session.get("user_phone")
    if not phone or not users_db.get(phone, {}).get("is_admin"):
        return jsonify({"success": False, "message": "Ruxsat yo'q!"}), 403

    return jsonify({
        "success": True,
        "deposits": deposit_requests,
        "withdraws": withdraw_requests,
        "forecast": admin_forecast
    })

@app.route("/api/admin/action_deposit", methods=["POST"])
def action_deposit():
    data = request.get_json() or {}
    req_id = data.get("id")
    action = data.get("action")

    for req in deposit_requests:
        if req["id"] == req_id and req["status"] == "Kutilmoqda":
            if action == "approve":
                req["status"] = "Tasdiqlandi"
                if req["phone"] in users_db:
                    users_db[req["phone"]]["balance"] += req["amount"]
            else:
                req["status"] = "Rad etildi"
    return jsonify({"success": True})

@app.route("/api/admin/set_forecast", methods=["POST"])
def set_forecast():
    phone = session.get("user_phone")
    if not phone or not users_db.get(phone, {}).get("is_admin"):
        return jsonify({"success": False}), 403

    data = request.get_json() or {}
    game = data.get("game")
    mode = data.get("mode")

    if game in admin_forecast:
        admin_forecast[game] = mode
    return jsonify({"success": True, "forecast": admin_forecast})

@app.route("/api/get_forecast/<game>", methods=["GET"])
def get_forecast(game):
    return jsonify({"mode": admin_forecast.get(game, "auto")})

if __name__ == "__main__":
    app.run(debug=True, port=5000)