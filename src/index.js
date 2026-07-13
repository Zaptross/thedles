/** 
 * 1. CONFIGURATION
 * Populate this array to build your playlist.
 */
const PLAYLIST_CONFIG = [
  {
    id: "wordle",
    name: "Wordle",
    url: "https://www.nytimes.com/games/wordle/index.html",
    openInNewTab: true,
    barPosition: "top"
  },
  {
    id: "4x3",
    name: "4 x 3",
    url: "https://hankgreen.com/fourbythree/",
    openInNewTab: false,
    barPosition: "bottom"
  },
  {
    id: "bandle",
    name: "Bandle",
    url: "https://bandle.app/daily",
    openInNewTab: false,
    barPosition: "bottom"
  },
  {
    id: "connections",
    name: "Connections",
    url: "https://www.nytimes.com/games/connections",
    openInNewTab: true,
    barPosition: "top"
  },
];

// Development mode check
const isDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Find next game index without data for today, or -1 if all complete
function findNextIncompleteGame() {
  const today = getTodayString();
  const todayResults = appState.results[today] || {};
  for (let i = 0; i < PLAYLIST_CONFIG.length; i++) {
    if (todayResults[PLAYLIST_CONFIG[i].id] === undefined) {
      return i;
    }
  }
  return -1; // All games have data
}

/**
 * 2. STATE MANAGEMENT
 */
const STORAGE_KEY = 'dle_playlist_data';

let appState = {
  lastPlayedDate: '',
  currentIndex: 0,
  theme: 'auto', // 'auto', 'light', or 'dark'
  results: {}    // Format: { 'YYYY-MM-DD': { 'gameId': 'Score text' } }
};

// Utilities
const getTodayString = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState = { ...appState, ...parsed };
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }
  }

  // Midnight Reset Logic
  const today = getTodayString();
  if (appState.lastPlayedDate !== today) {
    appState.currentIndex = 0;
    appState.lastPlayedDate = today;
    if (!appState.results[today]) {
      appState.results[today] = {};
    }
    saveState();
  }
  
  applyTheme(appState.theme);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function recordScore(gameId, textResult) {
  const today = getTodayString();
  if (!appState.results[today]) appState.results[today] = {};
  appState.results[today][gameId] = textResult; // if null, it denotes "skipped"
  saveState();
}

/**
 * 3. UI RENDERING LOGIC
 */
const screens = {
  empty: document.getElementById('screen-empty'),
  gate: document.getElementById('screen-gate'),
  game: document.getElementById('screen-game'),
  summary: document.getElementById('screen-summary')
};

// Session flag: once user clicks through gate, don't re-gate this session
let hasUserGesture = false;

function showScreen(screenKey) {
  Object.values(screens).forEach(el => el.classList.add('hidden'));
  screens[screenKey].classList.remove('hidden');
}

function renderApp() {
  if (!PLAYLIST_CONFIG || PLAYLIST_CONFIG.length === 0) {
    return showScreen('empty');
  }

  // If we've completed or skipped all games, go to summary
  if (appState.currentIndex >= PLAYLIST_CONFIG.length) {
    renderSummary();
    return;
  }

  // Check if current game needs new tab and we haven't had a user gesture yet
  const currentGame = PLAYLIST_CONFIG[appState.currentIndex];
  if (currentGame.openInNewTab && !hasUserGesture) {
    renderGate();
  } else {
    renderGame();
  }
}

function renderGate() {
  showScreen('gate');
  
  const currentGame = PLAYLIST_CONFIG[appState.currentIndex];
  const today = getTodayString();
  const todayResults = appState.results[today] || {};
  const hasAnyProgress = Object.keys(todayResults).length > 0;
  
  // Set contextual title and subtitle
  const titleEl = document.getElementById('gate-title');
  const subtitleEl = document.getElementById('gate-subtitle');
  const buttonEl = document.getElementById('btn-gate-start');
  
  if (appState.currentIndex === 0 && !hasAnyProgress) {
    titleEl.textContent = "Ready for your daily puzzles?";
    subtitleEl.textContent = "Your playlist awaits.";
    buttonEl.textContent = "Start Playlist";
  } else {
    titleEl.textContent = "The 'Dles";
    subtitleEl.textContent = "Pick up where you left off.";
    buttonEl.textContent = `Continue with ${currentGame.name}`;
  }
  
  // Render playlist preview
  const listEl = document.getElementById('gate-playlist-items');
  listEl.innerHTML = PLAYLIST_CONFIG.map((game, idx) => {
    const isCompleted = todayResults[game.id] !== undefined;
    const isCurrent = idx === appState.currentIndex;
    const classes = [
      isCompleted ? 'completed' : '',
      isCurrent ? 'current' : ''
    ].filter(Boolean).join(' ');
    return `<li class="${classes}">${game.name}</li>`;
  }).join('');
}

function renderGame() {
  showScreen('game');
  const game = PLAYLIST_CONFIG[appState.currentIndex];
  
  // Setup Control Bar
  const bar = document.getElementById('control-bar');
  bar.className = `control-bar ${game.barPosition === 'bottom' ? 'bottom' : 'top'}`;
  document.getElementById('game-title-display').textContent = game.name;
  
  const backBtn = document.getElementById('btn-back');
  backBtn.disabled = appState.currentIndex === 0;
  backBtn.style.opacity = appState.currentIndex === 0 ? '0.3' : '1';
  backBtn.style.cursor = appState.currentIndex === 0 ? 'default' : 'pointer';

  // Setup Iframe vs New Tab Fallback
  const iframe = document.getElementById('game-iframe');
  const fallback = document.getElementById('new-tab-fallback');
  
  if (game.openInNewTab) {
    iframe.classList.add('hidden');
    fallback.classList.remove('hidden');
    iframe.src = "";
    document.getElementById('new-tab-title').textContent = `Playing '${game.name}' in a new tab...`;
    
    // Automatically open tab on initial render of this step
    if (!window._tabsOpened) window._tabsOpened = {};
    if (!window._tabsOpened[game.id]) {
      window.open(game.url, '_blank');
      window._tabsOpened[game.id] = true;
    }
  } else {
    fallback.classList.add('hidden');
    iframe.classList.remove('hidden');
    // Only reload iframe if URL is different to prevent refreshing on pure UI state changes
    if (iframe.src !== game.url) {
      iframe.src = game.url;
    }
  }
}

function renderSummary() {
  showScreen('summary');
  const today = getTodayString();
  const todaysResults = appState.results[today] || {};
  const listContainer = document.getElementById('summary-list');
  listContainer.innerHTML = '';

  PLAYLIST_CONFIG.forEach((game, index) => {
    const result = todaysResults[game.id];
    const isSkipped = result === null || result === undefined;
    
    const card = document.createElement('div');
    card.className = 'summary-card';
    
    const header = document.createElement('div');
    header.className = 'summary-card-header';
    header.innerHTML = `<span>${game.name}</span>`;
    
    const body = document.createElement('div');
    
    if (isSkipped) {
      header.innerHTML += `<span class="status-skipped">Skipped</span>`;
      body.innerHTML = `<button class="btn secondary play-skipped-btn" data-index="${index}">Play Game</button>`;
    } else {
      header.innerHTML += `<button class="btn secondary icon-btn copy-single-btn" data-id="${game.id}" title="Copy Score">📋</button>`;
      body.className = 'summary-card-body';
      body.textContent = result;
    }
    
    card.appendChild(header);
    card.appendChild(body);
    listContainer.appendChild(card);
  });
  
  bindSummaryEvents();
}

/**
 * 4. EVENT LISTENERS
 */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderApp();
});

// Gate Screen Start Button
document.getElementById('btn-gate-start').addEventListener('click', () => {
  hasUserGesture = true;
  renderApp();
});

// Control Bar Nav
document.getElementById('btn-back').addEventListener('click', () => {
  if (appState.currentIndex > 0) {
    appState.currentIndex--;
    saveState();
    renderApp();
  }
});

document.getElementById('btn-skip').addEventListener('click', () => {
  const game = PLAYLIST_CONFIG[appState.currentIndex];
  // Mark as null to explicitly denote skipped today
  recordScore(game.id, null);
  appState.currentIndex++;
  saveState();
  renderApp();
});

document.getElementById('btn-submit').addEventListener('click', () => {
  const game = PLAYLIST_CONFIG[appState.currentIndex];
  document.getElementById('modal-title').textContent = `Submit Score for ${game.name}`;
  document.getElementById('score-input').value = '';
  document.getElementById('score-modal').classList.remove('hidden');
});

// New tab re-open
document.getElementById('btn-reopen-tab').addEventListener('click', () => {
  const game = PLAYLIST_CONFIG[appState.currentIndex];
  window.open(game.url, '_blank');
});

// Modal Logic
document.getElementById('btn-modal-cancel').addEventListener('click', () => {
  document.getElementById('score-modal').classList.add('hidden');
});

document.getElementById('btn-modal-save').addEventListener('click', () => {
  const input = document.getElementById('score-input').value.trim();
  if (input.length > 0) {
    const game = PLAYLIST_CONFIG[appState.currentIndex];
    recordScore(game.id, input);
    document.getElementById('score-modal').classList.add('hidden');
    
    // Find next game without data, or go to summary
    const nextIncomplete = findNextIncompleteGame();
    if (nextIncomplete === -1) {
      appState.currentIndex = PLAYLIST_CONFIG.length; // Triggers summary
    } else {
      appState.currentIndex = nextIncomplete;
    }
    saveState();
    renderApp();
  } else {
    alert("Please paste a score or click Cancel.");
  }
});

// Summary Events dynamically bound
function bindSummaryEvents() {
  document.querySelectorAll('.play-skipped-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'), 10);
      appState.currentIndex = idx;
      saveState();
      renderApp();
    });
  });

  document.querySelectorAll('.copy-single-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const text = appState.results[getTodayString()][id];
      copyToClipboard(text, e.target);
    });
  });
}

// Global Copy All
document.getElementById('btn-copy-all').addEventListener('click', (e) => {
  const today = getTodayString();
  const todaysResults = appState.results[today] || {};
  
  const textBlocks = [];
  PLAYLIST_CONFIG.forEach(game => {
    if (todaysResults[game.id]) { // skips nulls
      textBlocks.push(todaysResults[game.id].trim());
    }
  });

  // PRD requires exactly two blank lines between each game's score block.
  // Using 3 newline characters achieves this: Block1 \n (blank) \n (blank) \n Block2
  const finalString = textBlocks.join('\n\n\n');
  
  if (finalString) {
    copyToClipboard(finalString, e.target, "Copied All!");
  } else {
    alert("No scores to copy yet!");
  }
});

// Theme Toggle
document.getElementById('btn-theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                 (appState.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  appState.theme = newTheme;
  saveState();
});

function applyTheme(themeVal) {
  if (themeVal === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeVal);
  }
}

// Utilities
function copyToClipboard(text, btnElement, successText = "Copied!") {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btnElement.textContent;
    btnElement.textContent = successText;
    setTimeout(() => { btnElement.textContent = originalText; }, 2000);
  }).catch(err => {
    console.error("Clipboard write failed", err);
    alert("Failed to copy to clipboard.");
  });
}

/**
 * 6. DEV PANEL (Development Only)
 */
function initDevPanel() {
  if (!isDevelopment) return;
  
  const panel = document.getElementById('dev-panel');
  panel.classList.remove('hidden');
  
  // Render per-game buttons (clear + edit)
  const container = document.getElementById('dev-game-buttons');
  container.innerHTML = PLAYLIST_CONFIG.map(game => `
    <div class="dev-game-btn">
      <span>${game.name}</span>
      <button data-id="${game.id}" data-action="edit" title="Edit">✏️</button>
      <button data-id="${game.id}" data-action="clear" title="Clear">Clear</button>
    </div>
  `).join('');
  
  // Track which game is being edited
  let editingGameId = null;
  
  // Per-game button handlers
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const gameId = e.target.getAttribute('data-id');
      const action = e.target.getAttribute('data-action');
      const today = getTodayString();
      
      if (action === 'clear') {
        if (appState.results[today]) {
          delete appState.results[today][gameId];
          saveState();
          renderApp();
        }
      } else if (action === 'edit') {
        editingGameId = gameId;
        const game = PLAYLIST_CONFIG.find(g => g.id === gameId);
        const currentResult = appState.results[today]?.[gameId] || '';
        document.getElementById('dev-edit-title').textContent = `Edit: ${game.name}`;
        document.getElementById('dev-edit-input').value = currentResult;
        document.getElementById('dev-edit-modal').classList.remove('hidden');
      }
    });
  });
  
  // Dev edit modal handlers
  document.getElementById('btn-dev-edit-cancel').addEventListener('click', () => {
    document.getElementById('dev-edit-modal').classList.add('hidden');
    editingGameId = null;
  });
  
  document.getElementById('btn-dev-edit-save').addEventListener('click', () => {
    const today = getTodayString();
    const newValue = document.getElementById('dev-edit-input').value.trim();
    
    if (!appState.results[today]) {
      appState.results[today] = {};
    }
    
    if (newValue) {
      appState.results[today][editingGameId] = newValue;
    } else {
      delete appState.results[today][editingGameId];
    }
    
    saveState();
    document.getElementById('dev-edit-modal').classList.add('hidden');
    editingGameId = null;
    renderApp();
  });
  
  // Reset to start (show gate screen)
  document.getElementById('dev-reset-start').addEventListener('click', () => {
    appState.currentIndex = 0;
    hasUserGesture = false;
    saveState();
    renderApp();
  });
  
  // Skip to summary
  document.getElementById('dev-skip-summary').addEventListener('click', () => {
    appState.currentIndex = PLAYLIST_CONFIG.length;
    saveState();
    renderApp();
  });
  
  // Clear all today
  document.getElementById('dev-clear-today').addEventListener('click', () => {
    const today = getTodayString();
    appState.results[today] = {};
    appState.currentIndex = 0;
    saveState();
    renderApp();
  });
  
  // Clear all history
  document.getElementById('dev-clear-history').addEventListener('click', () => {
    if (confirm('Clear ALL historical data? This cannot be undone.')) {
      appState.results = {};
      appState.currentIndex = 0;
      appState.lastPlayedDate = '';
      saveState();
      location.reload();
    }
  });
}

// Initialize dev panel after DOM ready
document.addEventListener('DOMContentLoaded', initDevPanel);

/**
 * 7. SERVICE WORKER REGISTRATION
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}