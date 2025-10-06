from flask import Flask, request, jsonify, render_template, g, redirect, url_for
import sqlite3, os, secrets
from datetime import datetime

DB_PATH = 'database.db'
app = Flask(__name__)

# --------- دیتابیس ---------
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

def init_db():
    if not os.path.exists(DB_PATH):
        with app.app_context():
            db = get_db()
            db.execute('''CREATE TABLE users (
                username TEXT PRIMARY KEY,
                token TEXT,
                created_at TEXT
            )''')
            db.execute('''CREATE TABLE messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                sender_name TEXT,
                body TEXT,
                created_at TEXT
            )''')
            db.commit()
init_db()

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db:
        db.close()

# --------- صفحات HTML ---------
@app.route('/')
def index(): return render_template('index.html')
@app.route('/send.html')
def send(): return render_template('send.html')
@app.route('/inbox.html')
def inbox(): return render_template('inbox.html')

# --------- لینک‌های استاندارد ---------
@app.route('/u/<username>')
def public_link(username):
    # هدایت به send.html با query param
    return redirect(url_for('send', **{'user': username}))

@app.route('/i/<token>')
def inbox_link(token):
    # پیدا کردن username مربوط به token
    db = get_db()
    row = db.execute('SELECT username FROM users WHERE token=?',(token,)).fetchone()
    if not row:
        return "توکن نامعتبر", 404
    username = row['username']
    return redirect(url_for('inbox', **{'user': username, 'token': token}))

# --------- API ---------
@app.route('/api/create_user', methods=['POST'])
def create_user():
    data = request.json
    username = data.get('username')
    if not username:
        return jsonify({'error':'نام کاربری لازم است'}), 400
    token = secrets.token_hex(16)
    now = datetime.now().isoformat()
    db = get_db()
    db.execute('INSERT OR REPLACE INTO users(username, token, created_at) VALUES(?,?,?)',
               (username, token, now))
    db.commit()

    # لینک‌های استاندارد و fallback
    base = request.url_root.rstrip('/')
    public_link_pretty = f"{base}/u/{username}"
    inbox_link_pretty = f"{base}/i/{token}"
    public_link_fallback = f"{base}/send.html?user={username}"
    inbox_link_fallback = f"{base}/inbox.html?user={username}&token={token}"

    return jsonify({
        'public_link_pretty': public_link_pretty,
        'inbox_link_pretty': inbox_link_pretty,
        'public_link_fallback': public_link_fallback,
        'inbox_link_fallback': inbox_link_fallback,
        'token': token
    })

@app.route('/api/send_message', methods=['POST'])
def send_message():
    data = request.json
    username = data.get('username')
    body = data.get('body')
    sender = data.get('sender','-')
    if not username or not body:
        return jsonify({'error':'نام کاربری یا پیام خالی است'}),400
    now = datetime.now().isoformat()
    db = get_db()
    db.execute('INSERT INTO messages(username, sender_name, body, created_at) VALUES(?,?,?,?)',
               (username, sender, body, now))
    db.commit()
    return jsonify({'ok':True})

@app.route('/api/get_messages', methods=['GET'])
def get_messages():
    username = request.args.get('username')
    token = request.args.get('token')
    if not username or not token: return jsonify({'error':'پارامترها ناقص'}),400
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username=? AND token=?',(username,token)).fetchone()
    if not user: return jsonify({'error':'توکن نامعتبر'}),403
    msgs = db.execute('SELECT id, sender_name, body, created_at FROM messages WHERE username=? ORDER BY id DESC',(username,)).fetchall()
    return jsonify({'messages':[dict(m) for m in msgs]})

@app.route('/api/delete_message', methods=['POST'])
def delete_message():
    data = request.json
    username = data.get('username')
    token = data.get('token')
    msg_id = data.get('msg_id')
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username=? AND token=?',(username,token)).fetchone()
    if not user: return jsonify({'error':'توکن نامعتبر'}),403
    db.execute('DELETE FROM messages WHERE id=? AND username=?',(msg_id,username))
    db.commit()
    return jsonify({'ok':True})

if __name__ == '__main__':
    app.run(debug=True)
