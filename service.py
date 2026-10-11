"""App-owned gallery, curation, and bounded public submission policy.

The public lane can only read approved work and submit into a queue. It cannot
curate, approve, react, or read the queue. All mutable state is one SQLite file
under APP_STORAGE_DIR so separate service processes share atomic transactions.
"""
import base64
import binascii
from contextlib import contextmanager
import hashlib
import hmac
from io import BytesIO
import json
import math
import os
import secrets
from pathlib import Path
import re
import sqlite3
import sys
import time
from uuid import uuid4

from PIL import Image, ImageOps, ImageSequence, UnidentifiedImageError


ROOT = Path(os.environ['APP_STORAGE_DIR'])
ROOT.mkdir(parents=True, exist_ok=True)
DB = ROOT / 'gallery.sqlite3'
SEEDS = json.loads(Path(__file__).with_name('seed.json').read_text())
Image.MAX_IMAGE_PIXELS = 12_000_000
MAX_ART = 56  # Preserved collection capacity; physical holo frames rotate through it.
ROOMS = ('', 'memes', 'art', 'apps', 'agents')
EXHIBITION_FIELDS = (('art_date', 'Artwork date', 64), ('medium', 'Medium', 120),
                     ('dimensions', 'Dimensions', 100), ('artist_years', 'Artist years', 64),
                     ('artist_place', 'Artist place', 100))
MAX_INPUT = 3_000_000
# Participants sign in with an organiser-issued code; the code is exchanged for
# a signed, expiring token so artwork and official scores stay attributable
# without any external identity provider.
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
MAX_CODES = 2000
TOKEN_TTL = 30 * 86400
KEY_FILE = 'participant.key'
MAX_STORED = 2_750_000
ALLOWED = {'png': 'PNG', 'jpeg': 'JPEG', 'webp': 'WEBP', 'gif': 'GIF'}
PRESENCE_ROOMS = {
    'hangar': ((-20, 20), (-34, 34)),
    'gallery': ((-9, 9), (-48, 48)),
    'bridge': ((-18, 18), (0, 16)),
    'ceremony': ((-14, 14), (-16, 13)),
}
PRESENCE_TTL = 30
PRESENCE_MAX_ROOM = 24
PRESENCE_RETURN = 10


class Problem(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def require(ok, message, status=400):
    if not ok:
        raise Problem(status, message)


@contextmanager
def connection():
    db = sqlite3.connect(DB, timeout=8, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA busy_timeout=8000')
    db.execute('PRAGMA journal_mode=WAL')
    try:
        yield db
    finally:
        db.close()


def initialize(db):
    db.executescript('''
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS art(
          id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL,
          caption TEXT NOT NULL, ratio REAL NOT NULL, palette INTEGER NOT NULL,
          placeholder INTEGER NOT NULL, ceremony INTEGER NOT NULL DEFAULT 0,
          winner_rank INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL,
          mime TEXT, media BLOB, created_at REAL NOT NULL,
          reactions TEXT NOT NULL DEFAULT '{}'
        );
        CREATE TABLE IF NOT EXISTS submissions(
          id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL,
          caption TEXT NOT NULL, sender TEXT NOT NULL, ratio REAL NOT NULL,
          mime TEXT NOT NULL, media BLOB NOT NULL, created_at REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS attempts(sender TEXT NOT NULL, created_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS codes(
          code TEXT PRIMARY KEY, label TEXT NOT NULL DEFAULT '',
          created_at REAL NOT NULL, used_at REAL,
          revoked INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS signins(key TEXT NOT NULL, created_at REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS signins_time ON signins(created_at);
        CREATE TABLE IF NOT EXISTS scores(game TEXT NOT NULL, name TEXT NOT NULL, score REAL NOT NULL, created_at REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS scores_game ON scores(game, score);
        CREATE INDEX IF NOT EXISTS attempts_time ON attempts(created_at);
        CREATE TABLE IF NOT EXISTS presence(
          id TEXT PRIMARY KEY, room TEXT NOT NULL, callsign TEXT NOT NULL,
          helmet INTEGER NOT NULL, suit INTEGER NOT NULL, visor INTEGER NOT NULL,
          x REAL NOT NULL, z REAL NOT NULL, yaw REAL NOT NULL, updated_at REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS presence_room_time ON presence(room, updated_at);
        ''')
    db.execute('BEGIN IMMEDIATE')
    try:
        # v1.1: optional room per piece ('' = auto-placed). Existing samples get
        # their seed room once; owner-chosen rooms are never overwritten.
        if 'room' not in [r[1] for r in db.execute('PRAGMA table_info(art)')]:
            db.execute("ALTER TABLE art ADD COLUMN room TEXT NOT NULL DEFAULT ''")
            for item in SEEDS:
                db.execute("UPDATE art SET room=? WHERE id=? AND placeholder=1", (item.get('room', ''), item['id']))
        columns = {r[1] for r in db.execute('PRAGMA table_info(art)')}
        for field, _, _ in EXHIBITION_FIELDS:
            if field not in columns:
                db.execute(f"ALTER TABLE art ADD COLUMN {field} TEXT NOT NULL DEFAULT ''")
        score_columns = {r[1] for r in db.execute('PRAGMA table_info(scores)')}
        for field in ('suit_color', 'visor_color'):
            if field not in score_columns:
                db.execute(f"ALTER TABLE scores ADD COLUMN {field} TEXT NOT NULL DEFAULT ''")
        if not db.execute("SELECT 1 FROM meta WHERE key='seeded'").fetchone():
            now = time.time()
            for order, item in enumerate(SEEDS):
                db.execute('''INSERT INTO art
                  (id,title,author,caption,ratio,palette,placeholder,ceremony,winner_rank,sort_order,mime,media,created_at,reactions,room)
                  VALUES(?,?,?,?,?,?,1,0,0,?,?,NULL,?,'{}',?)''',
                  (item['id'], item['title'], item['author'], item['caption'], item['ratio'], item['palette'], order, None, now, item.get('room', '')))
            db.execute("INSERT INTO meta(key,value) VALUES('seeded','1')")
        db.commit()
    except Exception:
        db.rollback()
        raise


def text_field(value, name, limit, required=True):
    require(isinstance(value, str), name + ' must be text.')
    value = value.strip()
    require((not required or bool(value)) and len(value) <= limit,
            name + ' must be ' + ('1–' if required else '0–') + str(limit) + ' characters.')
    require(not any(ord(c) < 32 and c not in '\n\t' for c in value), name + ' contains invalid characters.')
    return value


def metadata(body):
    require(isinstance(body, dict), 'Send a JSON object.')
    return (text_field(body.get('title'), 'Title', 100),
            text_field(body.get('author'), 'Author', 80),
            text_field(body.get('caption', ''), 'Caption', 500, False))


def exhibition_fields(body, row=None):
    return tuple(text_field(body.get(field, row[field] if row is not None else ''), label, limit, False)
                 for field, label, limit in EXHIBITION_FIELDS)


def image_from_data_url(value):
    require(isinstance(value, str) and len(value) <= 4_100_000, 'Image is too large. Use an image under 3 MB.')
    match = re.fullmatch(r'data:image/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)', value, re.DOTALL)
    require(match is not None, 'Upload a PNG, JPEG, WebP or GIF image.')
    try:
        raw = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError):
        raise Problem(400, 'Image encoding is invalid.')
    require(0 < len(raw) <= MAX_INPUT, 'Image is too large. Use an image under 3 MB.')
    try:
        src = Image.open(BytesIO(raw))
        require(src.format == ALLOWED[match.group(1)], 'Image type does not match its contents.')
        require(src.width >= 16 and src.height >= 16, 'Image is too small.')
        require(src.width * src.height <= 12_000_000, 'Image has too many pixels.')
        if src.format == 'GIF':
            require(getattr(src, 'n_frames', 1) <= 60, 'GIF has too many frames (60 maximum).')
            frames, durations = [], []
            for frame in ImageSequence.Iterator(src):
                image = frame.convert('RGBA')
                image.thumbnail((960, 960), Image.Resampling.LANCZOS)
                frames.append(image)
                durations.append(max(20, min(1000, int(frame.info.get('duration', 100)))))
            out = BytesIO()
            frames[0].save(out, format='GIF', save_all=True, append_images=frames[1:],
                           duration=durations, loop=0, disposal=2, optimize=True)
            mime = 'image/gif'
            width, height = frames[0].size
        else:
            image = ImageOps.exif_transpose(src)
            image.thumbnail((1440, 1440), Image.Resampling.LANCZOS)
            image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
            out = BytesIO()
            image.save(out, format='WEBP', quality=82, method=5)
            mime = 'image/webp'
            width, height = image.size
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise Problem(400, 'Image could not be decoded safely.')
    payload = out.getvalue()
    require(len(payload) <= MAX_STORED, 'Optimized image is still too large. Choose a smaller image.')
    return mime, payload, width / height


def signing_key():
    """Per-installation key for participant tokens; created once, owner-read only."""
    path = ROOT / KEY_FILE
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        return path.read_bytes().strip()
    with os.fdopen(fd, 'wb') as handle:
        handle.write(secrets.token_hex(32).encode())
    return path.read_bytes().strip()


def _b64(raw):
    return base64.urlsafe_b64encode(raw).decode('ascii').rstrip('=')


def _unb64(text):
    return base64.urlsafe_b64decode(text + '=' * (-len(text) % 4))


def issue_token(code, name):
    payload = json.dumps({'c': code, 'n': name, 'e': int(time.time()) + TOKEN_TTL},
                         separators=(',', ':')).encode()
    digest = hmac.new(signing_key(), payload, hashlib.sha256).digest()
    return 'hs1.' + _b64(payload) + '.' + _b64(digest)


def read_token(db, token):
    """Return the verified participant behind a token, or fail with 401."""
    require(isinstance(token, str), 'Sign in with your participant code first.', 401)
    version, _, rest = token.partition('.')
    body, _, signature = rest.partition('.')
    require(version == 'hs1' and body and signature, 'Sign in again with your participant code.', 401)
    try:
        payload = _unb64(body)
        expected = _unb64(signature)
    except (binascii.Error, ValueError):
        raise Problem(401, 'Sign in again with your participant code.')
    if not hmac.compare_digest(expected, hmac.new(signing_key(), payload, hashlib.sha256).digest()):
        raise Problem(401, 'Sign in again with your participant code.')
    try:
        data = json.loads(payload)
    except ValueError:
        raise Problem(401, 'Sign in again with your participant code.')
    require(isinstance(data.get('e'), int) and data['e'] > time.time(),
            'Your sign-in expired. Use your participant code again.', 401)
    row = db.execute('SELECT code, revoked FROM codes WHERE code=?', (data.get('c'),)).fetchone()
    require(row is not None and not row['revoked'], 'This participant code was withdrawn.', 401)
    return {'code': row['code'], 'name': data.get('n') or row['code'], 'expires_at': data['e']}


def new_code(existing):
    while True:
        body = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        code = f'HS-{body[:4]}-{body[4:]}'
        if code not in existing:
            existing.add(code)
            return code


def signin_limit(db, key):
    now = time.time()
    db.execute('BEGIN IMMEDIATE')
    try:
        db.execute('DELETE FROM signins WHERE created_at<?', (now - 3600,))
        total = db.execute('SELECT COUNT(*) FROM signins').fetchone()[0]
        mine = db.execute('SELECT COUNT(*) FROM signins WHERE key=?', (key,)).fetchone()[0]
        require(total < 120 and mine < 8, 'Too many sign-in attempts. Try again later.', 429)
        db.execute('INSERT INTO signins(key,created_at) VALUES(?,?)', (key, now))
        db.commit()
    except Exception:
        db.rollback()
        raise


def code_rows(db):
    return [{'code': r['code'], 'label': r['label'], 'created_at': r['created_at'],
             'used_at': r['used_at'], 'revoked': bool(r['revoked'])}
            for r in db.execute('SELECT * FROM codes ORDER BY created_at, code')]


def art_row(row):
    return {key: row[key] for key in ('id', 'title', 'author', 'caption', 'ratio', 'palette', 'sort_order', 'created_at', *(field for field, _, _ in EXHIBITION_FIELDS))} | {
        'placeholder': bool(row['placeholder']), 'ceremony': bool(row['ceremony']),
        'winner_rank': row['winner_rank'], 'reactions': json.loads(row['reactions']),
        'mime': row['mime'], 'room': row['room'],
    }


def submission_row(row):
    return {key: row[key] for key in ('id', 'title', 'author', 'caption', 'sender', 'ratio', 'mime', 'created_at', 'status')}


# Arcade times count up (lower wins); coins and pilot runs count up.
GAMES = {'memory': ('ASC', 1, 3600), 'memes': ('ASC', 1, 7200),
         'coins': ('DESC', 0, 500), 'flight': ('DESC', 0, 100000)}


def format_score(game, score):
    if game == 'coins':
        return f'{int(score)} coins'
    if game == 'flight':
        return f'{int(score)} pts'
    minutes, seconds = divmod(score, 60)
    return f'{int(minutes)}:{seconds:04.1f}'


def record_score(db, game, name, score, suit_color='', visor_color=''):
    order = GAMES[game][0]
    db.execute('BEGIN IMMEDIATE')
    try:
        db.execute('INSERT INTO scores(game,name,score,created_at,suit_color,visor_color) VALUES(?,?,?,?,?,?)',
                   (game, name, score, time.time(), suit_color, visor_color))
        db.execute(f'''DELETE FROM scores WHERE game=? AND rowid NOT IN
                      (SELECT rowid FROM scores WHERE game=? ORDER BY score {order}, created_at LIMIT 50)''', (game, game))
        better = '<' if order == 'ASC' else '>'
        rank = db.execute(f'SELECT COUNT(*) FROM scores WHERE game=? AND score {better} ?', (game, score)).fetchone()[0] + 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {'rank': rank, 'display': format_score(game, score), 'scores': scores(db)}


def score_fields(body, name):
    game = body.get('game')
    require(game in GAMES, 'Choose memory, coins, memes or flight.')
    score = body.get('score')
    require(type(score) in (int, float) and GAMES[game][1] <= score <= GAMES[game][2], 'Score is out of range.')
    if game == 'flight':
        require(float(score).is_integer(), 'Flight score must be a whole number.')
        suit_color = body.get('suit_color', '')
        visor_color = body.get('visor_color', '')
        require(all(isinstance(c, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', c) for c in (suit_color, visor_color)),
                'Choose valid pilot colours.')
    else:
        suit_color = visor_color = ''
    return game, round(float(score), 1), suit_color, visor_color


def scores(db):
    result = {}
    for game, (order, _, _) in GAMES.items():
        rows = db.execute(f'SELECT name, score, created_at, suit_color, visor_color FROM scores WHERE game=? ORDER BY score {order}, created_at LIMIT 10', (game,))
        result[game] = [{'name': r['name'], 'score': r['score'], 'display': format_score(game, r['score']),
                         'created_at': r['created_at'], 'suit_color': r['suit_color'], 'visor_color': r['visor_color']} for r in rows]
    return result


def state(db, include_queue=False):
    pieces = [art_row(row) for row in db.execute('SELECT * FROM art ORDER BY sort_order,id')]
    origin = os.environ.get('INSTANCE_ORIGIN', '').rstrip('/')
    result = {'art': pieces, 'capacity': MAX_ART, 'ceremony_date': '2026-10-11',
              'signin_required': True,
              'submission_url': origin + '/api/app-services/hackathon-gallery/submit'}
    if include_queue:
        result['queue'] = [submission_row(row) for row in db.execute("SELECT * FROM submissions WHERE status='pending' ORDER BY created_at")]
    return result


def rate_limit(db, sender):
    now = time.time()
    db.execute('BEGIN IMMEDIATE')
    try:
        db.execute('DELETE FROM attempts WHERE created_at<?', (now - 3600,))
        global_count = db.execute('SELECT COUNT(*) FROM attempts').fetchone()[0]
        sender_count = db.execute('SELECT COUNT(*) FROM attempts WHERE sender=?', (sender,)).fetchone()[0]
        pending_count = db.execute("SELECT COUNT(*) FROM submissions WHERE status='pending'").fetchone()[0]
        require(global_count < 60 and sender_count < 5, 'Submission limit reached. Try again later.', 429)
        require(pending_count < 80, 'The moderation queue is full. Try again later.', 429)
        db.execute('INSERT INTO attempts(sender,created_at) VALUES(?,?)', (sender, now))
        db.commit()
    except Exception:
        db.rollback()
        raise


def body_object(req):
    body = req.get('body')
    return body if isinstance(body, dict) else None


def presence_request(db, body):
    """Ephemeral, opt-in room snapshots. Presence is never an official identity."""
    require(body is not None, 'Send a JSON object.')
    raw = body.get('id')
    require(isinstance(raw, str) and re.fullmatch(r'[0-9a-f]{32}', raw), 'Invalid visit ID.')
    # Other visitors receive only this one-way ID, never the bearer used to update it.
    visit_id = hashlib.sha256(bytes.fromhex(raw)).hexdigest()[:24]
    now = time.time()
    if body.get('leave') is True:
        db.execute('DELETE FROM presence WHERE id=?', (visit_id,))
        return {'status': 200, 'body': {'peers': [], 'online': 0},
                'headers': {'Cache-Control': 'no-store'}}

    room = body.get('room')
    require(room in PRESENCE_ROOMS, 'Join a walkable Station room first.')
    callsign = body.get('callsign')
    require(isinstance(callsign, str) and bool(re.fullmatch(r'[A-Z0-9 -]{1,14}', callsign)),
            'Choose a pilot callsign.')
    appearance = []
    for key, top in (('helmet', 2), ('suit', 5), ('visor', 3)):
        value = body.get(key)
        require(type(value) is int and 0 <= value <= top, 'Choose a valid pilot appearance.')
        appearance.append(value)
    position = []
    for key, (low, high) in zip(('x', 'z'), PRESENCE_ROOMS[room]):
        value = body.get(key)
        require(type(value) in (int, float) and math.isfinite(value) and low <= value <= high,
                'Pilot is outside this room.')
        position.append(round(value, 2))
    yaw = body.get('yaw')
    require(type(yaw) in (int, float) and math.isfinite(yaw), 'Choose a valid heading.')
    yaw = round((yaw + math.pi) % (2 * math.pi) - math.pi, 3)
    db.execute('BEGIN IMMEDIATE')
    try:
        db.execute('DELETE FROM presence WHERE updated_at<?', (now - PRESENCE_TTL,))
        previous = db.execute('SELECT room FROM presence WHERE id=?', (visit_id,)).fetchone()
        count = db.execute('SELECT COUNT(*) FROM presence WHERE room=?', (room,)).fetchone()[0]
        require((previous and previous['room'] == room) or count < PRESENCE_MAX_ROOM,
                'This room is full. Try again shortly.', 429)
        db.execute('''INSERT INTO presence(id,room,callsign,helmet,suit,visor,x,z,yaw,updated_at)
                      VALUES(?,?,?,?,?,?,?,?,?,?)
                      ON CONFLICT(id) DO UPDATE SET room=excluded.room,callsign=excluded.callsign,
                      helmet=excluded.helmet,suit=excluded.suit,visor=excluded.visor,
                      x=excluded.x,z=excluded.z,yaw=excluded.yaw,updated_at=excluded.updated_at''',
                   (visit_id, room, callsign, *appearance, *position, yaw, now))
        rows = db.execute('''SELECT id,callsign,helmet,suit,visor,x,z,yaw FROM presence
                             WHERE room=? AND id!=?''', (room, visit_id)).fetchall()
        db.commit()
    except Exception:
        db.rollback()
        raise
    rows = sorted(rows, key=lambda row: (row['x'] - position[0]) ** 2 + (row['z'] - position[1]) ** 2)
    return {'status': 200,
            'body': {'room': room, 'online': len(rows), 'peers': [dict(row) for row in rows[:PRESENCE_RETURN]]},
            'headers': {'Cache-Control': 'no-store'}}


def public_request(db, req):
    path, method = req.get('path'), req.get('method')
    if path == 'gallery' and method == 'GET':
        return {'status': 200, 'body': state(db), 'headers': {'Cache-Control': 'public, max-age=30'}}
    if path == 'scores' and method == 'GET':
        return {'status': 200, 'body': {'scores': scores(db)}, 'headers': {'Cache-Control': 'public, max-age=15'}}
    if path.startswith('media/') and method == 'GET':
        return media_response(db, path[6:])
    body = body_object(req)
    if path == 'presence' and method == 'POST':
        return presence_request(db, body)
    if path == 'signin' and method == 'POST':
        require(body is not None, 'Send a JSON object.')
        code = text_field(body.get('code', ''), 'Participant code', 24).upper().replace(' ', '-')
        name = text_field(body.get('name', ''), 'Name', 24)
        signin_limit(db, code.casefold())
        row = db.execute('SELECT * FROM codes WHERE code=?', (code,)).fetchone()
        require(row is not None and not row['revoked'], 'That participant code is not valid.', 403)
        if row['used_at'] is None:
            db.execute('UPDATE codes SET used_at=? WHERE code=?', (time.time(), code))
        return {'status': 200, 'body': {'token': issue_token(code, name), 'code': code, 'name': name,
                                        'expires_at': int(time.time()) + TOKEN_TTL}}
    if path == 'verify' and method == 'POST':
        require(body is not None, 'Send a JSON object.')
        participant = read_token(db, body.get('token'))
        return {'status': 200, 'body': participant}
    if path == 'scores/submit' and method == 'POST':
        require(body is not None, 'Send a JSON object.')
        participant = read_token(db, body.get('token'))
        game, score, suit_color, visor_color = score_fields(body, participant['name'])
        return {'status': 201,
                'body': record_score(db, game, participant['name'][:12], score, suit_color, visor_color)}
    require(path == 'submit' and method == 'POST', 'Not found.', 404)
    require(body is not None, 'Send a JSON object.')
    participant = read_token(db, body.get('token'))
    title, author, caption = metadata(body)
    sender = participant['code'] + '·' + participant['name']
    rate_limit(db, sender.casefold())
    mime, payload, ratio = image_from_data_url(body.get('image_data_url'))
    submission_id = uuid4().hex
    db.execute('BEGIN IMMEDIATE')
    try:
        db.execute('''INSERT INTO submissions(id,title,author,caption,sender,ratio,mime,media,created_at,status)
                      VALUES(?,?,?,?,?,?,?,?,?,'pending')''',
                   (submission_id, title, author, caption, sender, ratio, mime, payload, time.time()))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {'status': 202, 'body': {'submission_id': submission_id, 'status': 'pending',
                                     'message': 'Received for owner review; it is not public yet.'}}


def media_response(db, item_id):
    require(bool(re.fullmatch(r'[a-zA-Z0-9-]{1,80}', item_id or '')), 'Not found.', 404)
    row = db.execute('SELECT mime,media FROM art WHERE id=?', (item_id,)).fetchone()
    require(row is not None and row['media'] is not None, 'Image not found.', 404)
    return {'status': 200, 'body_base64': base64.b64encode(row['media']).decode('ascii'),
            'media_type': row['mime'], 'headers': {'Cache-Control': 'private, max-age=180'}}


def private_request(db, req):
    actor = req.get('actor') or {}
    require(actor.get('scope') in ('owner', 'app', 'agent'), 'Sign in to curate the gallery.', 403)
    path, method = req.get('path'), req.get('method')
    if path == 'state' and method == 'GET':
        return {'status': 200, 'body': state(db, True)}
    if path.startswith('media/') and method == 'GET':
        return media_response(db, path[6:])
    if path == 'scores' and method == 'GET':
        return {'status': 200, 'body': {'scores': scores(db)}}
    require(actor.get('access') != 'read', 'Read-only agents cannot change the gallery.', 403)
    body = req.get('body') or {}
    require(isinstance(body, dict), 'Send a JSON object.')
    if path == 'scores/add' and method == 'POST':
        name = text_field(body.get('name', ''), 'Name', 12)
        game, score, suit_color, visor_color = score_fields(body, name)
        return {'status': 201, 'body': record_score(db, game, name, score, suit_color, visor_color)}
    if path == 'codes' and method == 'GET':
        return {'status': 200, 'body': {'codes': code_rows(db)}}
    if path == 'codes/create' and method == 'POST':
        count = body.get('count', 1)
        require(type(count) is int and 1 <= count <= 50, 'Create between 1 and 50 codes at a time.')
        label = text_field(body.get('label', ''), 'Label', 60, False)
        db.execute('BEGIN IMMEDIATE')
        try:
            existing = {r[0] for r in db.execute('SELECT code FROM codes')}
            require(len(existing) + count <= MAX_CODES, f'The station holds {MAX_CODES} participant codes.', 409)
            created = [new_code(existing) for _ in range(count)]
            now = time.time()
            db.executemany('INSERT INTO codes(code,label,created_at) VALUES(?,?,?)',
                           [(code, label, now) for code in created])
            db.commit()
        except Exception:
            db.rollback()
            raise
        return {'status': 201, 'body': {'created': created, 'codes': code_rows(db)}}
    if path == 'codes/revoke' and method == 'POST':
        code = body.get('code')
        require(isinstance(code, str), 'Choose a participant code.')
        revoked = 1 if body.get('revoked', True) else 0
        db.execute('BEGIN IMMEDIATE')
        try:
            row = db.execute('SELECT code FROM codes WHERE code=?', (code,)).fetchone()
            require(row is not None, 'That participant code does not exist.', 404)
            db.execute('UPDATE codes SET revoked=? WHERE code=?', (revoked, code))
            db.commit()
        except Exception:
            db.rollback()
            raise
        return {'status': 200, 'body': {'codes': code_rows(db)}}
    if path == 'admin/add' and method == 'POST':
        title, author, caption = metadata(body)
        details = exhibition_fields(body)
        mime, payload, ratio = image_from_data_url(body.get('image_data_url'))
        db.execute('BEGIN IMMEDIATE')
        try:
            count = db.execute('SELECT COUNT(*) FROM art').fetchone()[0]
            require(count < MAX_ART, 'The station collection holds 56 works. Remove a piece before adding another.', 409)
            item_id = uuid4().hex
            db.execute('''INSERT INTO art(id,title,author,caption,ratio,palette,placeholder,ceremony,winner_rank,sort_order,mime,media,created_at,reactions)
                          VALUES(?,?,?,?,?,0,0,0,0,?,?,?,?, '{}')''',
                       (item_id, title, author, caption, ratio, count, mime, payload, time.time()))
            db.execute('''UPDATE art SET art_date=?,medium=?,dimensions=?,artist_years=?,artist_place=? WHERE id=?''',
                       (*details, item_id))
            db.commit()
        except Exception:
            db.rollback(); raise
        return {'status': 201, 'body': {'id': item_id}}
    if path == 'admin/reorder' and method == 'POST':
        ids = body.get('ids')
        require(isinstance(ids, list) and all(isinstance(x, str) for x in ids), 'Send ordered artwork IDs.')
        db.execute('BEGIN IMMEDIATE')
        try:
            existing = [r[0] for r in db.execute('SELECT id FROM art')]
            require(len(ids) == len(existing) and set(ids) == set(existing), 'Order must include every current piece exactly once.', 409)
            for index, item_id in enumerate(ids):
                db.execute('UPDATE art SET sort_order=? WHERE id=?', (index, item_id))
            db.commit()
        except Exception:
            db.rollback(); raise
        return {'status': 200, 'body': state(db, True)}
    if path in ('admin/update', 'admin/remove', 'react') and method == 'POST':
        item_id = body.get('id')
        require(isinstance(item_id, str), 'Choose an artwork.')
        db.execute('BEGIN IMMEDIATE')
        try:
            row = db.execute('SELECT * FROM art WHERE id=?', (item_id,)).fetchone()
            require(row is not None, 'Artwork no longer exists.', 404)
            if path == 'admin/remove':
                db.execute('DELETE FROM art WHERE id=?', (item_id,))
            elif path == 'react':
                emoji = body.get('emoji')
                require(emoji in ('🔥', '👏', '😂', '💚'), 'Choose a listed reaction.')
                reactions = json.loads(row['reactions'])
                reactions[emoji] = min(999999, int(reactions.get(emoji, 0)) + 1)
                db.execute('UPDATE art SET reactions=? WHERE id=?', (json.dumps(reactions), item_id))
            else:
                title, author, caption = metadata({
                    'title': body.get('title', row['title']),
                    'author': body.get('author', row['author']),
                    'caption': body.get('caption', row['caption'])})
                rank = body.get('winner_rank', row['winner_rank'])
                require(type(rank) is int and rank in (0, 1, 2, 3), 'Winner rank must be 0, 1, 2 or 3.')
                featured = body.get('ceremony', bool(row['ceremony']))
                require(type(featured) is bool, 'Ceremony selection must be true or false.')
                room = body.get('room', row['room'])
                require(room in ROOMS, 'Room must be memes, art, apps, agents or empty for automatic.')
                details = exhibition_fields(body, row)
                if rank:
                    db.execute('UPDATE art SET winner_rank=0 WHERE winner_rank=? AND id<>?', (rank, item_id))
                db.execute('''UPDATE art SET title=?,author=?,caption=?,winner_rank=?,ceremony=?,room=?,
                              art_date=?,medium=?,dimensions=?,artist_years=?,artist_place=? WHERE id=?''',
                           (title, author, caption, rank, int(featured or bool(rank)), room, *details, item_id))
            db.commit()
        except Exception:
            db.rollback(); raise
        return {'status': 200, 'body': state(db, True)}
    if path in ('admin/approve', 'admin/reject') and method == 'POST':
        submission_id = body.get('id')
        require(isinstance(submission_id, str), 'Choose a submission.')
        db.execute('BEGIN IMMEDIATE')
        try:
            row = db.execute("SELECT * FROM submissions WHERE id=? AND status='pending'", (submission_id,)).fetchone()
            require(row is not None, 'Submission is no longer pending.', 404)
            if path == 'admin/approve':
                count = db.execute('SELECT COUNT(*) FROM art').fetchone()[0]
                require(count < MAX_ART, 'The gallery has 56 wall slots. Remove a piece before approving another.', 409)
                item_id = uuid4().hex
                db.execute('''INSERT INTO art(id,title,author,caption,ratio,palette,placeholder,ceremony,winner_rank,sort_order,mime,media,created_at,reactions)
                              VALUES(?,?,?,?,?,0,0,0,0,?,?,?,?, '{}')''',
                           (item_id, row['title'], row['author'], row['caption'], row['ratio'], count,
                            row['mime'], row['media'], time.time()))
                db.execute("UPDATE submissions SET status='approved',media=x'' WHERE id=?", (submission_id,))
            else:
                db.execute("UPDATE submissions SET status='rejected',media=x'' WHERE id=?", (submission_id,))
            db.commit()
        except Exception:
            db.rollback(); raise
        return {'status': 200, 'body': state(db, True)}
    raise Problem(404, 'Not found.')


def main(req):
    require(isinstance(req, dict) and req.get('schema') == 1, 'Invalid service request.')
    with connection() as db:
        initialize(db)
        return public_request(db, req) if req.get('public') is True else private_request(db, req)


if __name__ == '__main__':
    try:
        print(json.dumps(main(json.load(sys.stdin)), ensure_ascii=False))
    except Problem as exc:
        print(json.dumps({'status': exc.status, 'body': {'error': exc.message}}, ensure_ascii=False))
    except Exception as exc:
        print(type(exc).__name__ + ': ' + str(exc), file=sys.stderr)
        print(json.dumps({'status': 500, 'body': {'error': 'Gallery could not complete this request.'}}))
