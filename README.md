# Repurpose AI

Transform your podcast transcripts into engaging social media content and newsletters using Claude AI.

![Repurpose AI](https://img.shields.io/badge/Powered%20by-Claude%20AI-7c3aed)

## What is Repurpose AI?

Repurpose AI is a local web application that helps podcasters and content creators repurpose their podcast transcripts into various content formats for LinkedIn and newsletters. It uses Anthropic's Claude AI to generate high-quality, authentic content that avoids typical AI-sounding language.

### Features

- **Bulk Upload**: Upload multiple .txt transcript files at once
- **Persistent Library**: All transcripts stored in a SQLite database that persists across deployments
- **5-Step Wizard**: Simple guided process to generate content
- **Multiple Content Types**:
  - LinkedIn: Single-Episode Insight Post, Contrarian Take, Listicle/Framework
  - Newsletter: Monthly Digest, Deep Dive Synthesis
- **3 Tone Options**: Straight Talk, Thinking Out Loud, Pattern Spotter
- **AI Episode Selection**: For synthesis content, Claude automatically selects relevant episodes
- **Regenerate & Adjust**: Regenerate content or adjust with specific instructions
- **Editable Prompts**: Customize all prompts via the Settings page
- **Copy & Post**: One-click copy for easy posting

---

## Quick Start (Beginner-Friendly)

### Prerequisites

You need two things installed on your computer:

1. **Python 3.8 or higher**
   - Check if you have it: Open Terminal/Command Prompt and type `python --version` or `python3 --version`
   - If not installed: Download from [python.org](https://www.python.org/downloads/)

2. **An Anthropic API Key**
   - Sign up at [console.anthropic.com](https://console.anthropic.com/)
   - Create an API key in the API Keys section
   - You'll need to add billing info (Claude API costs money per use, but it's affordable)

### Installation Steps

#### Step 1: Open Terminal

- **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
- **Windows**: Press `Win + R`, type "cmd", press Enter
- **Linux**: Press `Ctrl + Alt + T`

#### Step 2: Navigate to the Project Folder

```bash
cd /path/to/repurposeai
```

Replace `/path/to/repurposeai` with the actual path to this folder.

#### Step 3: Create a Virtual Environment (Recommended)

This keeps the project's packages separate from your system Python.

```bash
# Mac/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` at the start of your terminal prompt.

#### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

#### Step 5: Set Up Your API Key

1. Copy the example environment file:
   ```bash
   # Mac/Linux
   cp .env.example .env

   # Windows
   copy .env.example .env
   ```

2. Open the `.env` file in any text editor
3. Replace `your-api-key-here` with your actual Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
   ```
4. Save the file

#### Step 6: Run the Application

```bash
python app.py
```

You should see:
```
============================================================
  REPURPOSE AI - Podcast Content Repurposing Tool
============================================================

  Starting server at: http://localhost:5001
  Press Ctrl+C to stop

============================================================
```

#### Step 7: Open in Browser

Open your web browser and go to: **http://localhost:5001**

That's it! You're ready to use Repurpose AI.

---

## How to Use

### 1. Upload Transcripts

1. Click **Library** in the sidebar
2. Click the **Upload Transcripts** button at the top
3. Drag and drop your .txt transcript files, or click to browse
4. Files are automatically saved to your library

**Tip**: Name your files descriptively, like `Episode-42-John-Smith.txt`. The app will try to extract the episode title and guest name from the filename.

### 2. Manage Your Library

1. Click **Library** in the sidebar
2. Click any episode to:
   - Edit title, guest name, and episode link
   - Add notes
   - View transcript preview
   - Delete the episode

### 3. Generate Content

1. Click **Generate** in the sidebar
2. Follow the 5-step wizard:
   - **Step 1**: Select channel (LinkedIn or Newsletter)
   - **Step 2**: Select content type
   - **Step 3**: Select tone
   - **Step 4**: Select episode(s) — or let AI choose for synthesis content
   - **Step 5**: Click Generate and copy the result

### 4. Refine Generated Content

After content is generated, you have three options:
- **Copy**: Copy the content to clipboard
- **Regenerate**: Generate completely new content with the same settings
- **Adjust Content**: Enter specific adjustments (e.g., "make it shorter", "add more data points") and regenerate

### 5. Customize Prompts

1. Click **Settings** in the sidebar
2. Update your podcast link (used in all generated content)
3. Select a prompt to edit
4. Modify the base prompt, anti-AI-slop rules, or format instructions
5. Click **Save Changes**

---

## Content Types Explained

### LinkedIn

| Type | Description | Episodes |
|------|-------------|----------|
| **Single-Episode Insight Post** | Share one powerful insight from an episode (150-200 words) | 1 |
| **Contrarian Take** | Bold statement challenging conventional wisdom (100-150 words) | 1 |
| **Listicle/Framework** | 3-5 key takeaways in scannable format (150-200 words) | 1 |

### Newsletter

| Type | Description | Episodes |
|------|-------------|----------|
| **Monthly Episode Digest** | Recap of recent episodes with highlights (300-400 words) | 3-4 (you select) |
| **Deep Dive Synthesis** | AI identifies patterns across episodes (500-700 words) | 3-4 (AI selects) |

---

## Tones Explained

| Tone | Style | Best For |
|------|-------|----------|
| **Straight Talk** | Direct, no-fluff, short sentences | Busy professionals, quick insights |
| **Thinking Out Loud** | Personal discoveries, shows thought process | Building connection, vulnerability |
| **Pattern Spotter** | Connects dots, identifies trends | Thought leadership, unique perspective |

---

## Customizing Prompts

The prompts are stored in `prompts.json`. You can edit them:

1. **Via the Settings page** (recommended for beginners)
2. **Directly in the file** (for advanced customization)

### Anti-AI Slop Rules

Each prompt includes strict rules to avoid generic AI-sounding content. These ban phrases like:
- "In today's fast-paced world"
- "I'm excited to share"
- "Game changer", "Leverage", "Synergy"

You can customize these rules in the Settings page.

---

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"

Make sure you:
1. Created the `.env` file (copy from `.env.example`)
2. Added your API key to the `.env` file
3. Restarted the server after adding the key

### "Module not found" errors

Make sure you:
1. Activated the virtual environment: `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
2. Installed dependencies: `pip install -r requirements.txt`

### Port 5001 already in use

Either:
1. Stop whatever else is using port 5001
2. Or change the port in `app.py` (last line) to something like 5002

### Transcripts not uploading

Make sure:
1. Files are `.txt` format
2. Files are under 16MB
3. Files are UTF-8 encoded (standard text encoding)

---

## File Structure

```
repurposeai/
├── app.py              # Main Flask application
├── prompts.json        # Editable prompt templates
├── requirements.txt    # Python dependencies
├── .env               # Your API key (create from .env.example)
├── .env.example       # Template for environment variables
├── data/              # Persistent database storage
│   └── repurpose.db   # SQLite database (persists across Replit deployments)
├── uploads/           # Temporary upload storage
├── static/
│   ├── css/
│   │   └── style.css  # Application styles
│   ├── js/
│   │   └── app.js     # Frontend JavaScript
│   └── favicon.svg    # Application favicon
└── templates/
    └── index.html     # Main HTML template
```

---

## API Costs

Repurpose AI uses Anthropic's Claude API. Costs are based on tokens (roughly words) processed:

- **Input tokens**: Your transcript + prompt (~$3 per 1M tokens)
- **Output tokens**: Generated content (~$15 per 1M tokens)

A typical generation costs **less than $0.01**. Monthly costs for regular use are usually under $5.

---

## Development

### Running in Debug Mode

The app runs in debug mode by default, which means:
- Auto-reloads when you change code
- Shows detailed error messages

For production, set `debug=False` in `app.py` and change the `SECRET_KEY` in `.env`.

### Database

The SQLite database is stored at `data/repurpose.db`. This location was chosen to persist across Replit deployments.

**For Replit users**: The `data/` folder persists across deployments, so your uploaded transcripts won't be lost when you redeploy.

To reset the database:

```bash
rm data/repurpose.db
```

The database will be recreated when you restart the app.

**Note**: The database is NOT ignored by git, so you can optionally commit it to preserve your transcripts. If you prefer not to commit the database, add `data/*.db` to your `.gitignore`.

---

## Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Make sure all dependencies are installed
3. Check the terminal for error messages

---

## License

MIT License - Feel free to use and modify for your own purposes.
