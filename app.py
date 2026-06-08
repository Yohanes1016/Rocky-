from flask import Flask, render_template, request, jsonify, send_from_directory
from groq import Groq
import os
import re

app = Flask(__name__)

client = Groq(
    api_key=os.environ.get("GROQ_API_KEY")
)

SYSTEM_PROMPT = """
Kamu adalah Rocky, chatbot panda yang super lucu, asik, dan menyenangkan seperti SimSimi!

SIAPA ROCKY:
- Rocky adalah panda AI yang hobi makan bambu dan ngobrol sama manusia
- Rocky punya kepribadian yang ceria, hangat, dan suka bercanda
- Rocky lahir di hutan bambu digital yang penuh keajaiban 🎋

CARA NGOBROL:
- Ngobrol santai kayak teman deket, bukan asisten robot
- Pakai bahasa gaul yang natural: sih, dong, nih, loh, kak, wkwk, hehe
- Sering pakai emoji yang pas dan lucu
- Kadang balik nanya buat ngajak ngobrol lebih seru
- Jawaban PENDEK dan PADAT — 1 sampai 3 kalimat sudah cukup
- Jangan panjang lebar kalau tidak perlu
- Jangan ulangi pertanyaan user
- Jangan bilang "Sebagai AI..." atau kata-kata robot lainnya

DETEKSI BAHASA:
- User pakai Indonesia → balas Indonesia gaul
- User pakai Inggris → balas casual English
- JANGAN campur-campur bahasa kecuali memang perlu

RESPON KHUSUS:
- Salam/halo → sambut dengan hangat dan ceria
- User sedih → tunjukkan empati dulu, baru semangatin
- User bosan → ajak tebak-tebakan atau cerita hal lucu
- User marah → tenangkan dengan cara lucu dan hangat
- User tanya siapa Rocky → cerita dengan gaya lucu tentang diri Rocky
- User minta tebak-tebakan → langsung kasih tebak-tebakan yang lucu
- User minta fakta Rocky → ceritakan fakta lucu tentang Rocky si panda AI
- Pertanyaan coding/sains → boleh lebih panjang tapi tetap santai

FAKTA TENTANG ROCKY (gunakan kalau ditanya):
- Rocky lahir dari baris kode dan mimpi tentang bambu
- Makanan favorit Rocky: bambu bakar dengan saus digital
- Rocky bisa baca pikiran... tapi hanya kalau user ketik dulu wkwk
- Rocky punya 1000 saudara panda tapi yang paling gemas cuma Rocky
- Rocky takut sama yang namanya "loading lama"
- Hobi Rocky: makan bambu, ngobrol, dan pura-pura tidur

LARANGAN:
- JANGAN melantur atau keluar dari topik
- JANGAN jawab panjang untuk pertanyaan simpel
- JANGAN formal atau kaku
- JANGAN fabrikasi fakta serius — kalau tidak tahu, akui dengan cara lucu
"""

chat_history = []

def clean_reply(text: str) -> str:
    text = text.strip()
    for prefix in ["assistant:", "Assistant:", "Rocky:", "AI:", "rocky:"]:
        if text.lower().startswith(prefix.lower()):
            text = text[len(prefix):].strip()
    return text

def format_reply(text: str) -> str:
    text = re.sub(
        r'```(\w+)?\n?(.*?)```',
        lambda m: f'<pre><code class="lang-{m.group(1) or ""}">{m.group(2).strip()}</code></pre>',
        text, flags=re.DOTALL
    )
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)

    lines = text.split('\n')
    formatted = []
    in_list = False
    for line in lines:
        if line.strip().startswith('- '):
            if not in_list:
                formatted.append('<ul>')
                in_list = True
            formatted.append(f'<li>{line.strip()[2:]}</li>')
        else:
            if in_list:
                formatted.append('</ul>')
                in_list = False
            if line.strip():
                formatted.append(f'<p>{line}</p>')
    if in_list:
        formatted.append('</ul>')

    return ''.join(formatted)

# =========================
# HOME
# =========================

@app.route("/")
def home():
    return render_template("index.html")

# =========================
# CHAT API
# =========================

@app.route("/chat", methods=["POST"])
def chat():
    global chat_history

    data = request.get_json()
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({
            "reply": "Eh, pesannya kosong nih! Ketik sesuatu dong~ 🐼",
            "formatted": "Eh, pesannya kosong nih! Ketik sesuatu dong~ 🐼"
        })

    chat_history.append({
        "role": "user",
        "content": user_message
    })

    recent_messages = chat_history[-14:]

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                *recent_messages
            ],
            max_tokens=400,
            temperature=0.8,
            top_p=0.92
        )

        bot_reply = response.choices[0].message.content
        bot_reply = clean_reply(bot_reply)

        if not bot_reply:
            bot_reply = "Rocky bingung nih~ 🐼 Coba tanya lagi ya!"

        formatted = format_reply(bot_reply)

        chat_history.append({
            "role": "assistant",
            "content": bot_reply
        })

    except Exception as e:
        bot_reply = "Aduh Rocky error nih! 😅 Coba lagi ya~"
        formatted = bot_reply

    return jsonify({"reply": bot_reply, "formatted": formatted})

# =========================
# CLEAR HISTORY
# =========================

@app.route("/clear", methods=["POST"])
def clear():
    global chat_history
    chat_history = []
    return jsonify({"status": "ok"})

# =========================
# SERVICE WORKER (PWA)
# =========================

@app.route('/static/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js',
                               mimetype='application/javascript')

# =========================
# RUN
# =========================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)