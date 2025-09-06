import requests
import time
import json
import os
from datetime import datetime

# =================== تنظیمات ===================
TOKEN = "BEEGI0DLOWIEQPWHZEPEXPXOICZENMAGNDSTXMBBROYVNQPIUCPEODMXJVPMMLNO"  # توکن ربات
BASE_URL = f"https://botapi.rubika.ir/v3/{TOKEN}/"
GOOGLE_API_KEY = "AIzaSyAQPNp49STg9fhN1dtNgBRDZlaONdCw5ak"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

PASSWORD = "hakrek13851399"  # رمز دسترسی به آمار
STATS_FILE = "users_stats.json"

# =================== حافظه ===================
chat_memory = {}
waiting_for_password = {}
waiting_for_gpt = {}
start_time = time.time()

if os.path.exists(STATS_FILE):
    with open(STATS_FILE, "r") as f:
        users_stats = json.load(f)
else:
    users_stats = {}

# =================== توابع ===================
def save_stats():
    with open(STATS_FILE, "w") as f:
        json.dump(users_stats, f)

def get_updates(offset_id=None, limit=100):
    url = BASE_URL + "getUpdates"
    params = {"offset_id": offset_id, "limit": limit} if offset_id else {"limit": limit}
    try:
        response = requests.post(url, json=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            updates = data.get("data", {}).get("updates", [])
            return updates, data.get("data", {}).get("next_offset_id")
        return [], None
    except:
        return [], None

def send_message(chat_id, text):
    url = BASE_URL + "sendMessage"
    payload = {"chat_id": chat_id, "text": text, "disable_notification": False}
    try:
        response = requests.post(url, json=payload, timeout=10)
        return response.json().get("data", {}).get("message_id")
    except:
        return None

def ask_gemini_with_context(chat_id, user_text):
    if chat_memory.get(chat_id) is None:
        chat_memory[chat_id] = []

    chat_memory[chat_id].append({"role": "user", "content": user_text})
    # محدود کردن حافظه به آخرین 20 پیام
    if len(chat_memory[chat_id]) > 20:
        chat_memory[chat_id] = chat_memory[chat_id][-20:]

    prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in chat_memory[chat_id]])

    headers = {"Content-Type": "application/json", "X-goog-api-key": GOOGLE_API_KEY}
    payload = {"contents":[{"parts":[{"text": prompt}]}]}
    try:
        response = requests.post(GEMINI_URL, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()
        answer = data["candidates"][0]["content"]["parts"][0]["text"]
        chat_memory[chat_id].append({"role": "assistant", "content": answer})
        return answer
    except Exception as e:
        return f"⚠️ خطا در دریافت پاسخ هوش مصنوعی: {e}"

# =================== حلقه اصلی ===================
def main():
    last_offset_id = None
    processed_message_ids = set()
    print("🤖 ربات AI برنامه‌نویسی رلکس در حال اجرا است...")

    while True:
        updates, next_offset_id = get_updates(last_offset_id)
        if updates:
            for update in updates:
                if update.get("type") == "NewMessage" and "new_message" in update:
                    message = update["new_message"]
                    text = message.get("text", "").strip()
                    chat_id = str(update.get("chat_id"))
                    sender_id = message.get("sender_id")
                    message_id = str(message.get("message_id"))
                    timestamp = int(message.get("time", "0"))

                    if timestamp > start_time and message_id not in processed_message_ids:
                        processed_message_ids.add(message_id)

                        # ثبت کاربر جدید یا اصلاح کاربران قدیمی
                        if chat_id not in users_stats:
                            users_stats[chat_id] = {
                                "start_time": timestamp,
                                "request_count": 0,
                                "requests_in_window": 0,
                                "mute_until": 0,
                                "ban_count": 0,
                                "premium": False
                            }
                        else:
                            stats = users_stats[chat_id]
                            # اطمینان از وجود همه کلیدهای ضروری
                            stats.setdefault("requests_in_window", 0)
                            stats.setdefault("ban_count", 0)
                            stats.setdefault("premium", False)
                            stats.setdefault("request_count", 0)
                            stats.setdefault("mute_until", 0)

                        current_time = time.time()

                        # ===== رمز آمار =====
                        if waiting_for_password.get(chat_id, False):
                            if text.strip() == PASSWORD:
                                sorted_users = sorted(users_stats.items(), key=lambda x: x[1]['start_time'])
                                total_users = len(sorted_users)
                                report_lines = [f"📝 تعداد کاربران: {total_users}", "--------------------------"]
                                for uid, stats in sorted_users:
                                    start_time_formatted = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stats['start_time']))
                                    report_lines.append(
                                        f"👤 آیدی: {uid}\n🕒 استارت: {start_time_formatted}\n📝 درخواست‌ها: {stats.get('request_count', 0)}\n🛑 دفعات محدودیت: {stats.get('ban_count', 0)}\n--------------------------"
                                    )
                                send_message(chat_id, "\n".join(report_lines))
                            else:
                                send_message(chat_id, "⚠️ رمز اشتباه است!")
                            waiting_for_password[chat_id] = False
                            continue

                        if text.startswith("/hossinph12"):
                            send_message(chat_id, "🔒 لطفاً رمز را ارسال کنید:")
                            waiting_for_password[chat_id] = True
                            continue

                        # ===== دستور /lord =====
                        if text.startswith("/lord"):
                            stats = users_stats.get(chat_id)
                            if stats["mute_until"] > current_time:
                                remaining = int(stats["mute_until"] - current_time)
                                send_message(chat_id,
                                    f"⚠️ شما محدود هستید!\n👤 آیدی: {chat_id}\n⏱ مدت محدودیت: {remaining} ثانیه\n📝 تعداد درخواست‌ها: {stats['request_count']}\nبرای رفع محدودیت به ایدی @Adler_Alfrid پیام دهید."
                                )
                            else:
                                send_message(chat_id, "✅ شما محدود نیستید!")
                            continue

                        # ===== دستور /notsban =====
                        if text.startswith("/notsban"):
                            parts = text.split()
                            if len(parts) == 2:
                                target_id = parts[1]
                                if target_id in users_stats:
                                    users_stats[target_id]["mute_until"] = 0
                                    users_stats[target_id]["requests_in_window"] = 0
                                    users_stats[target_id]["ban_count"] = 0
                                    users_stats[target_id]["premium"] = True
                                    send_message(chat_id, f"✅ محدودیت کاربر {target_id} برای همیشه برداشته شد.")
                                    save_stats()
                            continue

                        # ===== دستور /panel =====
                        if text.startswith("/panel"):
                            stats = users_stats.get(chat_id)
                            if stats:
                                start_time_formatted = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stats['start_time']))
                                status = "💎 پریمیوم" if stats.get("premium") else "عادی (دارای محدودیت)"
                                send_message(chat_id,
                                    f"👤 یوزر ایدی: {chat_id}\n"
                                    f"🆔 چت ایدی: {chat_id}\n"
                                    f"🕒 تاریخ استارت ربات: {start_time_formatted}\n"
                                    f"📌 وضعیت اشتراک: {status}\n"
                                    f"📝 تعداد درخواست‌ها: {stats.get('request_count', 0)}\n"
                                    f"🛑 دفعات محدود شده: {stats.get('ban_count', 0)}"
                                )
                            continue

                        # ===== دستور /help =====
                        if text.startswith("/help"):
                            help_text = (
                                "📜 **لیست دستورات ربات رلکس**:\n\n"
                                "🔹 /lord : بررسی وضعیت محدودیت شما\n"
                                "🔹 /panel : مشاهده اطلاعات خودکاربر\n"
                                "🔹 /GPT : ارسال متن برای دریافت پاسخ از هوش مصنوعی\n"
                                "🔹 /translate : ترجمه متن به انگلیسی با هوش مصنوعی\n"
                                "🔹 /math : حل مسائل ریاضی با هوش مصنوعی\n"
                                "🔹 /help : نمایش این لیست دستورات\n\n"
                                "⚠️ محدودیت‌ها:\n"
                                "- بیش از ۱۰ درخواست در ۳۰ ثانیه → ۵ دقیقه سکوت\n"
                                "- کاربران پریمیوم محدودیت ندارند"
                            )
                            send_message(chat_id, help_text)
                            continue

                        # ===== دستور /GPT =====
                        if text.startswith("/GPT"):
                            send_message(chat_id, "📩 متن خود را برای هوش مصنوعی بنویسید:")
                            waiting_for_gpt[chat_id] = "GPT"
                            continue

                        # ===== دستور /translate =====
                        if text.startswith("/translate"):
                            send_message(chat_id, "📩 متن خود را برای ترجمه بنویسید:")
                            waiting_for_gpt[chat_id] = "translate"
                            continue

                        # ===== دستور /math =====
                        if text.startswith("/math"):
                            send_message(chat_id, "📩 مسئله ریاضی خود را بنویسید:")
                            waiting_for_gpt[chat_id] = "math"
                            continue

                        # پاسخ به پیام‌های GPT / translate / math
                        if waiting_for_gpt.get(chat_id):
                            mode = waiting_for_gpt[chat_id]
                            if mode == "GPT":
                                ai_response = ask_gemini_with_context(chat_id, text)
                                send_message(chat_id, f"پاسخ : رلکس | RLAX\n{ai_response}")
                            elif mode == "translate":
                                ai_response = ask_gemini_with_context(chat_id, f"Translate this text to English:\n{text}")
                                send_message(chat_id, f"🌐 ترجمه:\n{ai_response}")
                            elif mode == "math":
                                ai_response = ask_gemini_with_context(chat_id, f"Solve this math problem:\n{text}")
                                send_message(chat_id, f"🧮 پاسخ ریاضی:\n{ai_response}")
                            waiting_for_gpt[chat_id] = False
                            users_stats[chat_id]["request_count"] += 1
                            users_stats[chat_id]["requests_in_window"] += 1
                            save_stats()
                            continue

                        # ===== محدودیت درخواست‌ها و ضد اسپم =====
                        if users_stats[chat_id]["mute_until"] > current_time:
                            remaining = int(users_stats[chat_id]["mute_until"] - current_time)
                            send_message(chat_id, f"⚠️ شما در حالت سکوت هستید! {remaining} ثانیه باقی مانده.")
                            continue

                        # افزایش شمارنده‌ها برای هر پیام عادی
                        users_stats[chat_id]["request_count"] += 1
                        users_stats[chat_id]["requests_in_window"] += 1

                        # اعمال محدودیت ۱۰ درخواست در هر ۳۰ ثانیه
                        window = 30
                        stats_times = users_stats[chat_id].get("request_times", [])
                        stats_times = [t for t in stats_times if t > current_time - window]
                        stats_times.append(current_time)
                        users_stats[chat_id]["request_times"] = stats_times
                        if len(stats_times) > 10:
                            users_stats[chat_id]["mute_until"] = current_time + 300
                            users_stats[chat_id]["ban_count"] += 1
                            send_message(chat_id, "⚠️ بیش از ۱۰ درخواست در ۳۰ ثانیه! شما ۵ دقیقه سکوت شدید.")
                            users_stats[chat_id]["requests_in_window"] = 0
                            save_stats()
                            continue

                        # پاسخ هوش مصنوعی برای پیام‌های عادی
                        ai_response = ask_gemini_with_context(chat_id, text)
                        send_message(chat_id, f"پاسخ : رلکس | RLAX\n{ai_response}")
                        save_stats()

            if next_offset_id and next_offset_id != last_offset_id:
                last_offset_id = next_offset_id

        time.sleep(2)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nبات متوقف شد.")
