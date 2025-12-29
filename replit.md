# Repurpose AI

A Flask application for transforming podcast transcripts into social media content using Claude AI.

## Overview

This tool helps content creators repurpose their podcast episodes into various social media formats. It uses Anthropic's Claude AI to generate engaging content based on podcast transcripts.

## Features

- Upload and manage podcast transcripts (TXT files)
- Generate social media content with different tones
- Configure custom prompts for content generation
- SQLite database for episode storage

## Project Structure

```
├── app.py              # Main Flask application
├── prompts.json        # Prompt configurations for AI generation
├── requirements.txt    # Python dependencies
├── static/
│   ├── css/style.css   # Styling
│   └── js/app.js       # Frontend JavaScript
├── templates/
│   └── index.html      # Main HTML template
├── instance/           # SQLite database storage
└── uploads/            # Uploaded transcript files
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for Claude AI content generation
- `SECRET_KEY` - Flask secret key (optional, has default for dev)

## Running the Application

The application runs on port 5000 using Flask's development server.

## Tech Stack

- **Backend**: Python Flask
- **Database**: SQLite
- **AI**: Anthropic Claude API
- **Frontend**: Vanilla JavaScript, HTML, CSS
