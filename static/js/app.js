/**
 * Repurpose AI - Frontend Application
 * Transform podcast transcripts into social media content
 */

// ==============================================================================
// STATE MANAGEMENT
// ==============================================================================

const state = {
    currentPage: 'generate',
    wizardStep: 1,
    episodes: [],
    channels: [],
    tones: [],
    prompts: {},

    // Selection state
    selectedChannel: null,
    selectedContentType: null,
    selectedTone: null,
    selectedEpisodes: [],

    // Edit state
    editingEpisodeId: null
};

// ==============================================================================
// API FUNCTIONS
// ==============================================================================

async function api(endpoint, options = {}) {
    const response = await fetch(`/api${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });
    return response.json();
}

async function loadEpisodes() {
    const result = await api('/episodes');
    if (result.success) {
        state.episodes = result.episodes;
    }
    return result;
}

async function loadChannels() {
    const result = await api('/channels');
    if (result.success) {
        state.channels = result.channels;
        state.tones = result.tones;
    }
    return result;
}

async function loadPrompts() {
    const result = await api('/prompts');
    if (result.success) {
        state.prompts = result.prompts;
    }
    return result;
}

async function uploadFiles(files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    return response.json();
}

async function generateContent() {
    const result = await api('/generate', {
        method: 'POST',
        body: JSON.stringify({
            content_type: state.selectedContentType,
            tone: state.selectedTone,
            episode_ids: state.selectedEpisodes
        })
    });
    return result;
}

async function adjustContent(originalContent, adjustment) {
    const result = await api('/adjust', {
        method: 'POST',
        body: JSON.stringify({
            original_content: originalContent,
            adjustment: adjustment
        })
    });
    return result;
}

async function updateEpisode(id, data) {
    return api(`/episodes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteEpisode(id) {
    return api(`/episodes/${id}`, {
        method: 'DELETE'
    });
}

async function savePrompts(prompts) {
    return api('/prompts', {
        method: 'PUT',
        body: JSON.stringify(prompts)
    });
}

// ==============================================================================
// NAVIGATION
// ==============================================================================

function showPage(pageName) {
    state.currentPage = pageName;

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageName);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === `page-${pageName}`);
    });

    // Load data for page
    switch (pageName) {
        case 'library':
            renderLibrary();
            break;
        case 'generate':
            resetWizard();
            renderWizard();
            break;
        case 'settings':
            renderSettings();
            break;
    }
}

// Make showPage globally available
window.showPage = showPage;

// ==============================================================================
// WIZARD LOGIC
// ==============================================================================

function resetWizard() {
    state.wizardStep = 1;
    state.selectedChannel = null;
    state.selectedContentType = null;
    state.selectedTone = null;
    state.selectedEpisodes = [];

    // Hide result
    document.getElementById('generation-result').classList.add('hidden');
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('generate-btn').classList.remove('hidden');
}

function goToStep(step) {
    state.wizardStep = step;
    renderWizard();
}

function nextStep() {
    // Validate current step
    if (!validateStep(state.wizardStep)) {
        return;
    }

    if (state.wizardStep < 5) {
        state.wizardStep++;
        renderWizard();
    }
}

function prevStep() {
    if (state.wizardStep > 1) {
        state.wizardStep--;
        renderWizard();
    }
}

function validateStep(step) {
    switch (step) {
        case 1:
            if (!state.selectedChannel) {
                showToast('Please select a channel', 'warning');
                return false;
            }
            return true;
        case 2:
            if (!state.selectedContentType) {
                showToast('Please select a content type', 'warning');
                return false;
            }
            return true;
        case 3:
            if (!state.selectedTone) {
                showToast('Please select a tone', 'warning');
                return false;
            }
            return true;
        case 4:
            const contentType = getSelectedContentTypeInfo();
            if (contentType && contentType.episode_selection !== 'multiple_ai_selected') {
                if (state.selectedEpisodes.length === 0) {
                    showToast('Please select an episode', 'warning');
                    return false;
                }
            }
            return true;
        default:
            return true;
    }
}

function getSelectedContentTypeInfo() {
    const channel = state.channels.find(c => c.key === state.selectedChannel);
    if (!channel) return null;
    return channel.content_types.find(ct => ct.key === state.selectedContentType);
}

function renderWizard() {
    // Update progress steps
    document.querySelectorAll('.progress-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum === state.wizardStep);
        step.classList.toggle('completed', stepNum < state.wizardStep);
    });

    // Update wizard steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum === state.wizardStep);
    });

    // Update navigation buttons
    document.getElementById('prev-btn').disabled = state.wizardStep === 1;
    const nextBtn = document.getElementById('next-btn');
    nextBtn.classList.toggle('hidden', state.wizardStep === 5);

    // Render step content
    switch (state.wizardStep) {
        case 1:
            renderChannelOptions();
            break;
        case 2:
            renderContentTypeOptions();
            break;
        case 3:
            renderToneOptions();
            break;
        case 4:
            renderEpisodeOptions();
            break;
        case 5:
            renderGenerationSummary();
            break;
    }
}

// Channel icons as SVG
const channelIcons = {
    linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    newsletter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>`,
    twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
};

// Define channel order
const channelOrder = ['linkedin', 'newsletter', 'twitter', 'instagram'];

function renderChannelOptions() {
    const container = document.getElementById('channel-options');

    // Sort channels by predefined order
    const sortedChannels = [...state.channels].sort((a, b) => {
        const aIndex = channelOrder.indexOf(a.key);
        const bIndex = channelOrder.indexOf(b.key);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    container.innerHTML = sortedChannels.map(channel => `
        <div class="option-card channel-card ${channel.enabled ? '' : 'disabled'} ${state.selectedChannel === channel.key ? 'selected' : ''}"
             data-channel="${channel.key}"
             ${channel.enabled ? '' : 'title="Coming soon"'}>
            <div class="channel-icon ${channel.key}">
                ${channelIcons[channel.key] || ''}
            </div>
            <h4>${channel.name}</h4>
            <p>${channel.content_types.length} content type${channel.content_types.length !== 1 ? 's' : ''}</p>
            ${!channel.enabled ? '<span class="coming-soon">Coming Soon</span>' : ''}
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.option-card:not(.disabled)').forEach(card => {
        card.addEventListener('click', () => {
            state.selectedChannel = card.dataset.channel;
            state.selectedContentType = null; // Reset content type when channel changes
            renderChannelOptions();
        });
    });
}

function renderContentTypeOptions() {
    const channel = state.channels.find(c => c.key === state.selectedChannel);
    if (!channel) return;

    const container = document.getElementById('content-type-options');
    container.innerHTML = channel.content_types.map(ct => `
        <div class="option-card ${state.selectedContentType === ct.key ? 'selected' : ''}"
             data-type="${ct.key}">
            <h4>${ct.name}</h4>
            <p>${ct.description}</p>
            <div class="option-meta">${ct.target_length}</div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', () => {
            state.selectedContentType = card.dataset.type;
            renderContentTypeOptions();
        });
    });
}

function renderToneOptions() {
    const container = document.getElementById('tone-options');
    container.innerHTML = state.tones.map(tone => `
        <div class="option-card ${state.selectedTone === tone.key ? 'selected' : ''}"
             data-tone="${tone.key}">
            <h4>${tone.name}</h4>
            <p>${tone.description}</p>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', () => {
            state.selectedTone = card.dataset.tone;
            renderToneOptions();
        });
    });
}

function renderEpisodeOptions() {
    const container = document.getElementById('episode-selection');
    const descEl = document.getElementById('episode-step-description');

    const contentType = getSelectedContentTypeInfo();
    const isMultiSelect = contentType && contentType.episode_selection === 'multiple_recent';
    const isAISelect = contentType && contentType.episode_selection === 'multiple_ai_selected';

    if (isAISelect) {
        descEl.textContent = 'AI will analyze your library and select the most relevant episodes';
        container.innerHTML = `
            <div class="option-card selected">
                <h4>AI Auto-Selection</h4>
                <p>Claude will analyze all ${state.episodes.length} episodes in your library and select 3-4 that best fit a compelling theme.</p>
            </div>
        `;
        return;
    }

    if (isMultiSelect) {
        descEl.textContent = 'Select 3-4 episodes for the digest';
    } else {
        descEl.textContent = 'Choose an episode from your library';
    }

    if (state.episodes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No episodes in your library.</p>
                <button class="btn btn-primary" onclick="showPage('upload')">Upload Transcripts</button>
            </div>
        `;
        return;
    }

    const inputType = isMultiSelect ? 'checkbox' : 'radio';

    container.innerHTML = state.episodes.map(ep => `
        <label class="episode-option ${state.selectedEpisodes.includes(ep.id) ? 'selected' : ''}">
            <input type="${inputType}" name="episode" value="${ep.id}"
                   ${state.selectedEpisodes.includes(ep.id) ? 'checked' : ''}>
            <div class="episode-option-content">
                <h4>${ep.title}</h4>
                <p>${ep.guest_name || 'No guest specified'}</p>
            </div>
        </label>
    `).join('');

    // Add change handlers
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            if (isMultiSelect) {
                if (e.target.checked) {
                    if (state.selectedEpisodes.length < 4) {
                        state.selectedEpisodes.push(id);
                    } else {
                        e.target.checked = false;
                        showToast('Maximum 4 episodes allowed', 'warning');
                    }
                } else {
                    state.selectedEpisodes = state.selectedEpisodes.filter(eid => eid !== id);
                }
            } else {
                state.selectedEpisodes = [id];
            }
            renderEpisodeOptions();
        });
    });
}

function renderGenerationSummary() {
    const channel = state.channels.find(c => c.key === state.selectedChannel);
    const contentType = getSelectedContentTypeInfo();
    const tone = state.tones.find(t => t.key === state.selectedTone);

    let episodeText = '';
    if (contentType && contentType.episode_selection === 'multiple_ai_selected') {
        episodeText = 'AI will select 3-4 episodes';
    } else {
        const selectedEps = state.episodes.filter(e => state.selectedEpisodes.includes(e.id));
        episodeText = selectedEps.map(e => e.title).join(', ') || 'None selected';
    }

    const container = document.getElementById('generation-summary');
    container.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">Channel</span>
            <span class="summary-value">${channel ? channel.name : '-'}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Content Type</span>
            <span class="summary-value">${contentType ? contentType.name : '-'}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Tone</span>
            <span class="summary-value">${tone ? tone.name : '-'}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Episode(s)</span>
            <span class="summary-value">${episodeText}</span>
        </div>
    `;
}

async function handleGenerate() {
    const generateBtn = document.getElementById('generate-btn');
    const loadingState = document.getElementById('loading-state');
    const resultContainer = document.getElementById('generation-result');
    const resultContent = document.getElementById('result-content');
    const adjustPanel = document.getElementById('adjust-panel');

    // Show loading
    generateBtn.classList.add('hidden');
    loadingState.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    adjustPanel.classList.add('hidden');

    try {
        const result = await generateContent();

        if (result.success) {
            resultContent.textContent = result.content;
            resultContainer.classList.remove('hidden');
            showToast('Content generated successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to generate content', 'error');
            generateBtn.classList.remove('hidden');
        }
    } catch (error) {
        showToast('An error occurred: ' + error.message, 'error');
        generateBtn.classList.remove('hidden');
    } finally {
        loadingState.classList.add('hidden');
    }
}

async function handleRegenerate() {
    const loadingState = document.getElementById('loading-state');
    const resultContainer = document.getElementById('generation-result');
    const resultContent = document.getElementById('result-content');
    const adjustPanel = document.getElementById('adjust-panel');

    // Show loading
    loadingState.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    adjustPanel.classList.add('hidden');

    try {
        const result = await generateContent();

        if (result.success) {
            resultContent.textContent = result.content;
            resultContainer.classList.remove('hidden');
            showToast('Content regenerated!', 'success');
        } else {
            showToast(result.error || 'Failed to regenerate content', 'error');
            resultContainer.classList.remove('hidden');
        }
    } catch (error) {
        showToast('An error occurred: ' + error.message, 'error');
        resultContainer.classList.remove('hidden');
    } finally {
        loadingState.classList.add('hidden');
    }
}

function toggleAdjustPanel() {
    const adjustPanel = document.getElementById('adjust-panel');
    const contentWrapper = document.getElementById('result-content-wrapper');

    adjustPanel.classList.toggle('hidden');

    if (!adjustPanel.classList.contains('hidden')) {
        // Show adjust panel - dim content
        contentWrapper.classList.add('dimmed');
        document.getElementById('adjust-input').focus();
    } else {
        // Hide adjust panel - restore content
        contentWrapper.classList.remove('dimmed');
    }
}

function cancelAdjust() {
    const adjustPanel = document.getElementById('adjust-panel');
    const contentWrapper = document.getElementById('result-content-wrapper');
    const adjustInput = document.getElementById('adjust-input');

    adjustPanel.classList.add('hidden');
    contentWrapper.classList.remove('dimmed');
    adjustInput.value = '';
}

async function handleAdjustContent() {
    const adjustInput = document.getElementById('adjust-input');
    const adjustment = adjustInput.value.trim();

    if (!adjustment) {
        showToast('Please enter what you want to adjust', 'warning');
        return;
    }

    const loadingState = document.getElementById('loading-state');
    const resultContainer = document.getElementById('generation-result');
    const resultContent = document.getElementById('result-content');
    const adjustPanel = document.getElementById('adjust-panel');
    const contentWrapper = document.getElementById('result-content-wrapper');
    const originalContent = resultContent.textContent;

    // Show loading
    loadingState.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    try {
        const result = await adjustContent(originalContent, adjustment);

        if (result.success) {
            resultContent.textContent = result.content;
            resultContainer.classList.remove('hidden');
            adjustPanel.classList.add('hidden');
            contentWrapper.classList.remove('dimmed');
            adjustInput.value = '';
            showToast('Content adjusted!', 'success');
        } else {
            showToast(result.error || 'Failed to adjust content', 'error');
            resultContainer.classList.remove('hidden');
        }
    } catch (error) {
        showToast('An error occurred: ' + error.message, 'error');
        resultContainer.classList.remove('hidden');
    } finally {
        loadingState.classList.add('hidden');
    }
}

function handleCopy() {
    const content = document.getElementById('result-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// ==============================================================================
// LIBRARY PAGE
// ==============================================================================

function renderLibrary() {
    const listContainer = document.getElementById('episode-list');
    const statsContainer = document.getElementById('library-stats');
    const emptyState = document.getElementById('library-empty');

    if (state.episodes.length === 0) {
        listContainer.classList.add('hidden');
        statsContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    listContainer.classList.remove('hidden');
    statsContainer.classList.remove('hidden');

    // Render stats
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${state.episodes.length}</div>
            <div class="stat-label">Total Episodes</div>
        </div>
    `;

    // Render episode list
    listContainer.innerHTML = state.episodes.map(ep => `
        <div class="episode-card" data-id="${ep.id}">
            <div class="episode-card-header">
                <h4>${ep.title}</h4>
                <span class="episode-date">${formatDate(ep.upload_date)}</span>
            </div>
            <div class="episode-meta">
                <span>Guest: ${ep.guest_name || 'Not specified'}</span>
                <span>${formatTranscriptLength(ep.transcript)} words</span>
            </div>
        </div>
    `).join('');

    // Add click handlers
    listContainer.querySelectorAll('.episode-card').forEach(card => {
        card.addEventListener('click', () => {
            openEpisodeModal(parseInt(card.dataset.id));
        });
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTranscriptLength(transcript) {
    return transcript.split(/\s+/).length.toLocaleString();
}

// ==============================================================================
// EPISODE MODAL
// ==============================================================================

function openEpisodeModal(episodeId) {
    const episode = state.episodes.find(e => e.id === episodeId);
    if (!episode) return;

    state.editingEpisodeId = episodeId;

    document.getElementById('modal-title').textContent = 'Episode Details';
    document.getElementById('edit-title').value = episode.title;
    document.getElementById('edit-guest').value = episode.guest_name || '';
    document.getElementById('edit-link').value = episode.episode_link || '';
    document.getElementById('edit-notes').value = episode.notes || '';
    document.getElementById('transcript-preview').textContent =
        episode.transcript.substring(0, 1000) + (episode.transcript.length > 1000 ? '...' : '');

    document.getElementById('episode-modal').classList.remove('hidden');
}

function closeEpisodeModal() {
    document.getElementById('episode-modal').classList.add('hidden');
    state.editingEpisodeId = null;
}

async function handleSaveEpisode() {
    if (!state.editingEpisodeId) return;

    const data = {
        title: document.getElementById('edit-title').value,
        guest_name: document.getElementById('edit-guest').value,
        episode_link: document.getElementById('edit-link').value,
        notes: document.getElementById('edit-notes').value
    };

    const result = await updateEpisode(state.editingEpisodeId, data);

    if (result.success) {
        await loadEpisodes();
        renderLibrary();
        closeEpisodeModal();
        showToast('Episode updated', 'success');
    } else {
        showToast(result.error || 'Failed to update episode', 'error');
    }
}

async function handleDeleteEpisode() {
    if (!state.editingEpisodeId) return;

    if (!confirm('Are you sure you want to delete this episode? This cannot be undone.')) {
        return;
    }

    const result = await deleteEpisode(state.editingEpisodeId);

    if (result.success) {
        await loadEpisodes();
        renderLibrary();
        closeEpisodeModal();
        showToast('Episode deleted', 'success');
    } else {
        showToast(result.error || 'Failed to delete episode', 'error');
    }
}

// ==============================================================================
// UPLOAD FUNCTIONALITY (in Library page)
// ==============================================================================

function showUploadSection() {
    document.getElementById('upload-section').classList.remove('hidden');
    document.getElementById('upload-results').classList.add('hidden');
    document.getElementById('upload-progress').classList.add('hidden');
}

function hideUploadSection() {
    document.getElementById('upload-section').classList.add('hidden');
}

function initUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    if (!uploadZone || !fileInput) return;

    // Click to upload
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset for next upload
    });

    // Upload button in header
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', showUploadSection);
    }

    // Empty state upload button
    const emptyUploadBtn = document.getElementById('empty-upload-btn');
    if (emptyUploadBtn) {
        emptyUploadBtn.addEventListener('click', showUploadSection);
    }

    // Close upload button
    const closeUploadBtn = document.getElementById('close-upload-btn');
    if (closeUploadBtn) {
        closeUploadBtn.addEventListener('click', hideUploadSection);
    }
}

async function handleFiles(files) {
    if (files.length === 0) return;

    const progressContainer = document.getElementById('upload-progress');
    const resultsContainer = document.getElementById('upload-results');
    const resultsList = document.getElementById('upload-results-list');
    const progressFill = document.getElementById('progress-fill');
    const uploadStatus = document.getElementById('upload-status');

    // Show progress
    progressContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    progressFill.style.width = '0%';
    uploadStatus.textContent = `Uploading ${files.length} file(s)...`;

    // Animate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 90);
        progressFill.style.width = `${progress}%`;
    }, 200);

    try {
        const result = await uploadFiles(files);

        clearInterval(progressInterval);
        progressFill.style.width = '100%';

        // Show results
        setTimeout(async () => {
            progressContainer.classList.add('hidden');
            resultsContainer.classList.remove('hidden');

            let resultsHtml = '';
            if (result.uploaded && result.uploaded.length > 0) {
                result.uploaded.forEach(file => {
                    resultsHtml += `<div class="upload-result-item success">✓ ${file.filename}</div>`;
                });
            }
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach(error => {
                    resultsHtml += `<div class="upload-result-item error">✗ ${error}</div>`;
                });
            }

            resultsList.innerHTML = resultsHtml;

            // Reload episodes and re-render library
            await loadEpisodes();
            renderLibrary();

            if (result.uploaded && result.uploaded.length > 0) {
                showToast(`Uploaded ${result.uploaded.length} file(s)`, 'success');

                // Auto-hide upload section after 2 seconds
                setTimeout(() => {
                    hideUploadSection();
                }, 2000);
            }
        }, 500);

    } catch (error) {
        clearInterval(progressInterval);
        progressContainer.classList.add('hidden');
        showToast('Upload failed: ' + error.message, 'error');
    }
}

// ==============================================================================
// SETTINGS PAGE
// ==============================================================================

// Channel prefixes for prompt dropdown
const channelPrefixes = {
    'linkedin_single_episode': 'LinkedIn',
    'linkedin_contrarian': 'LinkedIn',
    'linkedin_listicle': 'LinkedIn',
    'newsletter_monthly_digest': 'Newsletter',
    'newsletter_deep_dive': 'Newsletter'
};

function getChannelPrefix(key) {
    if (key.startsWith('linkedin')) return 'LinkedIn';
    if (key.startsWith('newsletter')) return 'Newsletter';
    if (key.startsWith('twitter')) return 'Twitter';
    if (key.startsWith('instagram')) return 'Instagram';
    return '';
}

function renderSettings() {
    // Set podcast link
    document.getElementById('podcast-link').value =
        state.prompts.default_podcast_link || '';

    // Populate prompt selector with channel prefixes
    const promptSelect = document.getElementById('prompt-select');
    const contentTypes = state.prompts.content_types || {};

    // Sort content types by channel
    const sortedKeys = Object.keys(contentTypes).sort((a, b) => {
        const aPrefix = getChannelPrefix(a);
        const bPrefix = getChannelPrefix(b);
        return aPrefix.localeCompare(bPrefix);
    });

    promptSelect.innerHTML = sortedKeys.map(key => {
        const ct = contentTypes[key];
        const prefix = getChannelPrefix(key);
        const displayName = prefix ? `${prefix}: ${ct.name}` : ct.name;
        return `<option value="${key}">${displayName}</option>`;
    }).join('');

    // Load first prompt
    if (sortedKeys.length > 0) {
        renderPromptEditor(sortedKeys[0]);
    }

    // Add change handler
    promptSelect.addEventListener('change', (e) => {
        renderPromptEditor(e.target.value);
    });
}

// Tooltip definitions for prompt fields
const promptTooltips = {
    'base_prompt': 'Core instructions that define what content to generate',
    'anti_ai_slop_rules': 'Rules to prevent generic AI-sounding language',
    'format_instructions': 'Define the structure and formatting of output'
};

function renderPromptEditor(contentTypeKey) {
    const container = document.getElementById('prompt-fields');
    const contentType = state.prompts.content_types?.[contentTypeKey];

    if (!contentType) {
        container.innerHTML = '<p>No prompt data available</p>';
        return;
    }

    container.innerHTML = `
        <div class="form-group">
            <label for="edit-base-prompt">
                <span>Base Prompt</span>
                <span class="tooltip-icon" data-tooltip="${promptTooltips.base_prompt}">?</span>
            </label>
            <textarea id="edit-base-prompt" data-field="base_prompt">${contentType.base_prompt || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="edit-anti-slop">
                <span>Anti-AI Slop Rules</span>
                <span class="tooltip-icon" data-tooltip="${promptTooltips.anti_ai_slop_rules}">?</span>
            </label>
            <textarea id="edit-anti-slop" data-field="anti_ai_slop_rules">${contentType.anti_ai_slop_rules || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="edit-format">
                <span>Format Instructions</span>
                <span class="tooltip-icon" data-tooltip="${promptTooltips.format_instructions}">?</span>
            </label>
            <textarea id="edit-format" data-field="format_instructions">${contentType.format_instructions || ''}</textarea>
        </div>
    `;
}

async function handleSaveSettings() {
    const podcastLink = document.getElementById('podcast-link').value;
    const promptSelect = document.getElementById('prompt-select');
    const selectedPrompt = promptSelect.value;

    // Update podcast link
    state.prompts.default_podcast_link = podcastLink;

    // Update selected prompt fields
    if (selectedPrompt && state.prompts.content_types?.[selectedPrompt]) {
        const fields = document.querySelectorAll('#prompt-fields textarea');
        fields.forEach(field => {
            const fieldName = field.dataset.field;
            if (fieldName) {
                state.prompts.content_types[selectedPrompt][fieldName] = field.value;
            }
        });
    }

    const result = await savePrompts(state.prompts);

    if (result.success) {
        showToast('Settings saved', 'success');
    } else {
        showToast('Failed to save settings', 'error');
    }
}

// ==============================================================================
// TOAST NOTIFICATIONS
// ==============================================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==============================================================================
// INITIALIZATION
// ==============================================================================

async function init() {
    // Load initial data
    await Promise.all([
        loadEpisodes(),
        loadChannels(),
        loadPrompts()
    ]);

    // Set up logo click handler - navigate to home/generate page
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('generate');
        });
    }

    // Set up navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(link.dataset.page);
        });
    });

    // Set up wizard navigation
    document.getElementById('next-btn').addEventListener('click', nextStep);
    document.getElementById('prev-btn').addEventListener('click', prevStep);
    document.getElementById('generate-btn').addEventListener('click', handleGenerate);
    document.getElementById('copy-btn').addEventListener('click', handleCopy);
    document.getElementById('regenerate-btn').addEventListener('click', handleRegenerate);
    document.getElementById('adjust-btn').addEventListener('click', toggleAdjustPanel);
    document.getElementById('submit-adjust-btn').addEventListener('click', handleAdjustContent);
    document.getElementById('cancel-adjust-btn').addEventListener('click', cancelAdjust);

    // Allow Enter key to submit adjustment
    document.getElementById('adjust-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAdjustContent();
        }
    });

    // Set up modal
    document.getElementById('modal-close').addEventListener('click', closeEpisodeModal);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEpisodeModal);
    document.getElementById('save-episode-btn').addEventListener('click', handleSaveEpisode);
    document.getElementById('delete-episode-btn').addEventListener('click', handleDeleteEpisode);
    document.querySelector('.modal-backdrop').addEventListener('click', closeEpisodeModal);

    // Set up settings
    document.getElementById('save-settings-btn').addEventListener('click', handleSaveSettings);

    // Initialize upload
    initUpload();

    // Show initial page
    showPage('generate');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
