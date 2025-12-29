"""
Repurpose AI - Transform podcast transcripts into social media content
A Flask application for repurposing podcast content using Claude AI
"""

import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['DATABASE'] = 'instance/repurpose.db'

# Ensure directories exist
Path('uploads').mkdir(exist_ok=True)
Path('instance').mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {'txt'}

# ==============================================================================
# DATABASE FUNCTIONS
# ==============================================================================

def get_db():
    """Get database connection."""
    db = sqlite3.connect(app.config['DATABASE'])
    db.row_factory = sqlite3.Row
    return db

def init_db():
    """Initialize the database with schema."""
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            guest_name TEXT,
            filename TEXT NOT NULL,
            transcript TEXT NOT NULL,
            upload_date TEXT NOT NULL,
            episode_link TEXT,
            notes TEXT
        )
    ''')
    db.commit()
    db.close()

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ==============================================================================
# PROMPTS CONFIGURATION
# ==============================================================================

def load_prompts():
    """Load prompts from JSON file."""
    prompts_path = Path('prompts.json')
    if prompts_path.exists():
        with open(prompts_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_prompts(prompts_data):
    """Save prompts to JSON file."""
    with open('prompts.json', 'w', encoding='utf-8') as f:
        json.dump(prompts_data, f, indent=2, ensure_ascii=False)

# ==============================================================================
# CLAUDE API INTEGRATION
# ==============================================================================

def generate_content_with_claude(prompt: str) -> dict:
    """Generate content using Claude API."""
    api_key = os.getenv('ANTHROPIC_API_KEY')

    if not api_key:
        return {
            'success': False,
            'error': 'ANTHROPIC_API_KEY not configured. Please add it to your .env file.'
        }

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        return {
            'success': True,
            'content': message.content[0].text
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def build_prompt(content_type_key: str, tone_key: str, episodes: list, prompts_config: dict) -> str:
    """Build the full prompt for content generation."""
    content_types = prompts_config.get('content_types', {})
    tone_definitions = prompts_config.get('tone_definitions', {})
    podcast_link = prompts_config.get('default_podcast_link', 'https://yourpodcast.com')

    if content_type_key not in content_types:
        raise ValueError(f"Unknown content type: {content_type_key}")

    content_type = content_types[content_type_key]

    # Get base prompt
    base_prompt = content_type.get('base_prompt', '')

    # Get tone modifier
    tone_modifier = content_type.get('tone_modifiers', {}).get(tone_key, '')

    # Get anti-AI slop rules
    anti_slop = content_type.get('anti_ai_slop_rules', '')

    # Get format instructions
    format_instructions = content_type.get('format_instructions', '')

    # Build transcript section
    if len(episodes) == 1:
        ep = episodes[0]
        transcript_section = ep['transcript']
        guest_name = ep.get('guest_name', 'Guest')
        episode_title = ep.get('title', 'Episode')
        episode_link = ep.get('episode_link', podcast_link)
    else:
        # Multiple episodes
        transcript_parts = []
        for i, ep in enumerate(episodes, 1):
            transcript_parts.append(f"=== EPISODE {i}: {ep.get('title', 'Episode')} ===")
            transcript_parts.append(f"Guest: {ep.get('guest_name', 'Guest')}")
            transcript_parts.append(f"Transcript:\n{ep['transcript']}\n")
        transcript_section = "\n\n".join(transcript_parts)
        guest_name = "Multiple Guests"
        episode_title = "Multiple Episodes"
        episode_link = podcast_link

    # Replace placeholders
    full_prompt = base_prompt
    full_prompt = full_prompt.replace('{transcript}', transcript_section)
    full_prompt = full_prompt.replace('{transcripts_list}', transcript_section)
    full_prompt = full_prompt.replace('{all_transcripts}', transcript_section)
    full_prompt = full_prompt.replace('{guest_name}', guest_name)
    full_prompt = full_prompt.replace('{episode_title}', episode_title)
    full_prompt = full_prompt.replace('{episode_link}', episode_link)
    full_prompt = full_prompt.replace('{podcast_link}', podcast_link)
    full_prompt = full_prompt.replace('{selected_tone}', tone_key)

    # Add tone modifier
    full_prompt += f"\n\n{tone_modifier}"

    # Add anti-slop rules
    full_prompt += f"\n\n{anti_slop}"

    # Add format instructions
    full_prompt += f"\n\n{format_instructions}"

    return full_prompt

# ==============================================================================
# API ROUTES
# ==============================================================================

@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')

@app.route('/api/episodes', methods=['GET'])
def get_episodes():
    """Get all episodes."""
    db = get_db()
    episodes = db.execute('SELECT * FROM episodes ORDER BY upload_date DESC').fetchall()
    db.close()

    return jsonify({
        'success': True,
        'episodes': [dict(ep) for ep in episodes]
    })

@app.route('/api/episodes/<int:episode_id>', methods=['GET'])
def get_episode(episode_id):
    """Get a single episode."""
    db = get_db()
    episode = db.execute('SELECT * FROM episodes WHERE id = ?', (episode_id,)).fetchone()
    db.close()

    if episode:
        return jsonify({'success': True, 'episode': dict(episode)})
    return jsonify({'success': False, 'error': 'Episode not found'}), 404

@app.route('/api/episodes/<int:episode_id>', methods=['PUT'])
def update_episode(episode_id):
    """Update episode metadata."""
    data = request.json
    db = get_db()

    db.execute('''
        UPDATE episodes
        SET title = ?, guest_name = ?, episode_link = ?, notes = ?
        WHERE id = ?
    ''', (
        data.get('title'),
        data.get('guest_name'),
        data.get('episode_link'),
        data.get('notes'),
        episode_id
    ))
    db.commit()
    db.close()

    return jsonify({'success': True})

@app.route('/api/episodes/<int:episode_id>', methods=['DELETE'])
def delete_episode(episode_id):
    """Delete an episode."""
    db = get_db()
    db.execute('DELETE FROM episodes WHERE id = ?', (episode_id,))
    db.commit()
    db.close()

    return jsonify({'success': True})

@app.route('/api/upload', methods=['POST'])
def upload_transcripts():
    """Upload one or more transcript files."""
    if 'files' not in request.files:
        return jsonify({'success': False, 'error': 'No files provided'}), 400

    files = request.files.getlist('files')
    uploaded = []
    errors = []

    db = get_db()

    for file in files:
        if file.filename == '':
            continue

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)

            # Read transcript content
            try:
                transcript = file.read().decode('utf-8')
            except UnicodeDecodeError:
                # Try with latin-1 encoding
                file.seek(0)
                transcript = file.read().decode('latin-1')

            # Extract title from filename (remove .txt extension)
            title = filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ')

            # Try to extract guest name from title (common format: "Episode X - Guest Name")
            guest_name = ''
            if ' - ' in title:
                parts = title.split(' - ')
                if len(parts) >= 2:
                    guest_name = parts[-1]

            # Save to database
            cursor = db.execute('''
                INSERT INTO episodes (title, guest_name, filename, transcript, upload_date, episode_link, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                title,
                guest_name,
                filename,
                transcript,
                datetime.now().isoformat(),
                '',
                ''
            ))

            uploaded.append({
                'id': cursor.lastrowid,
                'filename': filename,
                'title': title
            })
        else:
            errors.append(f"Invalid file: {file.filename}")

    db.commit()
    db.close()

    return jsonify({
        'success': True,
        'uploaded': uploaded,
        'errors': errors
    })

@app.route('/api/prompts', methods=['GET'])
def get_prompts():
    """Get all prompts configuration."""
    prompts = load_prompts()
    return jsonify({'success': True, 'prompts': prompts})

@app.route('/api/prompts', methods=['PUT'])
def update_prompts():
    """Update prompts configuration."""
    data = request.json
    save_prompts(data)
    return jsonify({'success': True})

@app.route('/api/channels', methods=['GET'])
def get_channels():
    """Get available channels and content types."""
    prompts = load_prompts()
    channel_config = prompts.get('channel_config', {})
    content_types = prompts.get('content_types', {})
    tone_definitions = prompts.get('tone_definitions', {})

    channels = []
    for key, config in channel_config.items():
        channel_data = {
            'key': key,
            'name': config.get('name', key),
            'enabled': config.get('enabled', False),
            'status': config.get('status', 'active' if config.get('enabled') else 'coming_soon'),
            'content_types': []
        }

        for ct_key in config.get('content_types', []):
            if ct_key in content_types:
                ct = content_types[ct_key]
                channel_data['content_types'].append({
                    'key': ct_key,
                    'name': ct.get('name', ct_key),
                    'description': ct.get('description', ''),
                    'target_length': ct.get('target_length', ''),
                    'episode_selection': ct.get('episode_selection', 'single')
                })

        channels.append(channel_data)

    tones = []
    for key, config in tone_definitions.items():
        tones.append({
            'key': key,
            'name': config.get('name', key),
            'description': config.get('description', '')
        })

    return jsonify({
        'success': True,
        'channels': channels,
        'tones': tones
    })

@app.route('/api/generate', methods=['POST'])
def generate_content():
    """Generate content using Claude AI."""
    data = request.json

    content_type = data.get('content_type')
    tone = data.get('tone')
    episode_ids = data.get('episode_ids', [])

    if not content_type or not tone:
        return jsonify({'success': False, 'error': 'Missing content_type or tone'}), 400

    # Load prompts config
    prompts_config = load_prompts()

    # Get content type info
    content_types = prompts_config.get('content_types', {})
    ct_info = content_types.get(content_type, {})

    # Get episodes
    db = get_db()

    # For multi-episode AI-selected content, get all episodes
    if ct_info.get('episode_selection') == 'multiple_ai_selected':
        episodes_data = db.execute('SELECT * FROM episodes').fetchall()
    elif episode_ids:
        placeholders = ','.join('?' * len(episode_ids))
        episodes_data = db.execute(
            f'SELECT * FROM episodes WHERE id IN ({placeholders})',
            episode_ids
        ).fetchall()
    else:
        return jsonify({'success': False, 'error': 'No episodes selected'}), 400

    db.close()

    if not episodes_data:
        return jsonify({'success': False, 'error': 'No episodes found'}), 400

    episodes = [dict(ep) for ep in episodes_data]

    try:
        # Build the prompt
        full_prompt = build_prompt(content_type, tone, episodes, prompts_config)

        # Generate content with Claude
        result = generate_content_with_claude(full_prompt)

        if result['success']:
            return jsonify({
                'success': True,
                'content': result['content'],
                'content_type': content_type,
                'tone': tone,
                'episodes_used': len(episodes)
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==============================================================================
# STATIC FILES
# ==============================================================================

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files."""
    return send_from_directory('static', filename)

# ==============================================================================
# INITIALIZATION
# ==============================================================================

# Initialize database on startup
with app.app_context():
    init_db()

if __name__ == '__main__':
    print("\n" + "="*60)
    print("  REPURPOSE AI - Podcast Content Repurposing Tool")
    print("="*60)
    print("\n  Starting server at: http://0.0.0.0:5000")
    print("  Press Ctrl+C to stop\n")
    print("="*60 + "\n")

    app.run(debug=True, host='0.0.0.0', port=5000)
