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
  {
    id: "crossword",
    name: "NYT Crossword",
    url: "https://www.nytimes.com/crosswords",
    openInNewTab: true,
    barPosition: "top",
    paidSubscription: "Requires NYT Games subscription"
  },
  {
    id: "regexle",
    name: "Regexle",
    url: "https://regexle.com/",
    openInNewTab: false,
    barPosition: "bottom"
  },
  {
    id: "strands",
    name: "Strands",
    url: "https://www.nytimes.com/games/strands",
    openInNewTab: true,
    barPosition: "top"
  },
  {
    id: "worldle",
    name: "Worldle",
    url: "https://worldle.teuteuf.fr/",
    openInNewTab: false,
    barPosition: "bottom"
  },
  {
    id: "globle",
    name: "Globle",
    url: "https://globle-game.com/",
    openInNewTab: false,
    barPosition: "bottom"
  },
];

// Development mode check
const isDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Get the active playlist based on user preferences
function getActivePlaylist() {
  if (!appState.preferences) {
    return PLAYLIST_CONFIG;
  }
  
  const prefs = appState.preferences;
  
  // Get enabled games in user's order
  let playlist = prefs.gameOrder
    .filter(id => prefs.enabledGames.includes(id))
    .map(id => PLAYLIST_CONFIG.find(g => g.id === id))
    .filter(Boolean);
  
  // Add any new games not in user's order (if enabled)
  PLAYLIST_CONFIG.forEach(g => {
    if (prefs.enabledGames.includes(g.id) && !playlist.find(p => p.id === g.id)) {
      playlist.push(g);
    }
  });
  
  return playlist;
}

// Get today's playlist (may be shuffled/subset based on settings)
function getTodaysPlaylist() {
  let playlist = getActivePlaylist();
  
  if (!appState.preferences) return playlist;
  
  const prefs = appState.preferences;
  const today = getTodayString();
  
  // Check if we already generated today's playlist
  if (appState.todaysPlaylistDate === today && appState.todaysPlaylist) {
    return appState.todaysPlaylist;
  }
  
  // Apply randomization if enabled
  if (prefs.randomizeOrder || prefs.randomSubset) {
    // Date-seeded shuffle
    const seed = hashCode(today);
    playlist = seededShuffle([...playlist], seed);
    
    // Apply subset if enabled
    if (prefs.randomSubset && prefs.subsetSize < playlist.length) {
      playlist = playlist.slice(0, prefs.subsetSize);
    }
  }
  
  // Cache today's playlist
  appState.todaysPlaylist = playlist;
  appState.todaysPlaylistDate = today;
  
  return playlist;
}

// Invalidate cached playlist (call when preferences change)
function invalidatePlaylistCache() {
  appState.todaysPlaylist = null;
  appState.todaysPlaylistDate = null;
}

// Simple hash function for date seeding
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Seeded shuffle (Fisher-Yates with seeded random)
function seededShuffle(array, seed) {
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Find next game index without data for today, or -1 if all complete
function findNextIncompleteGame() {
  const playlist = getTodaysPlaylist();
  const today = getTodayString();
  const todayResults = appState.results[today] || {};
  for (let i = 0; i < playlist.length; i++) {
    if (todayResults[playlist[i].id] === undefined) {
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
  summary: document.getElementById('screen-summary'),
  settings: document.getElementById('screen-settings')
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
  
  // Check for day change (user left app open overnight)
  const today = getTodayString();
  if (appState.lastPlayedDate && appState.lastPlayedDate !== today) {
    appState.currentIndex = 0;
    appState.lastPlayedDate = today;
    hasUserGesture = false; // Reset gesture for new day's popup
    saveState();
  }

  const playlist = getTodaysPlaylist();
  
  // If no games enabled, force settings open
  if (playlist.length === 0) {
    openSettings('gate');
    return;
  }

  // If we've completed or skipped all games, go to summary
  if (appState.currentIndex >= playlist.length) {
    renderSummary();
    return;
  }

  // Check if current game needs new tab and we haven't had a user gesture yet
  const currentGame = playlist[appState.currentIndex];
  if (currentGame.openInNewTab && !hasUserGesture) {
    renderGate();
  } else {
    renderGame();
  }
}

function renderGate() {
  showScreen('gate');
  
  const playlist = getTodaysPlaylist();
  const currentGame = playlist[appState.currentIndex];
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
  listEl.innerHTML = playlist.map((game, idx) => {
    const isCompleted = todayResults[game.id] !== undefined;
    const isCurrent = idx === appState.currentIndex;
    const classes = [
      isCompleted ? 'completed' : '',
      isCurrent ? 'current' : ''
    ].filter(Boolean).join(' ');
    return `<li class="${classes}">${game.name}</li>`;
  }).join('');
  
  // Show/hide subset controls
  const prefs = appState.preferences || {};
  const subsetControls = document.getElementById('subset-controls');
  if (prefs.randomSubset && subsetControls) {
    subsetControls.classList.remove('hidden');
    const enabledCount = (prefs.enabledGames || []).length;
    const subsetSize = prefs.subsetSize || 5;
    document.getElementById('subset-count').textContent = `${Math.min(subsetSize, enabledCount)} game${subsetSize !== 1 ? 's' : ''}`;
    
    // Disable buttons at limits
    document.getElementById('btn-subset-minus').disabled = subsetSize <= 1;
    document.getElementById('btn-subset-plus').disabled = subsetSize >= enabledCount;
  } else if (subsetControls) {
    subsetControls.classList.add('hidden');
  }
}

function renderGame() {
  showScreen('game');
  const playlist = getTodaysPlaylist();
  const game = playlist[appState.currentIndex];
  
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
  const playlist = getTodaysPlaylist();
  const today = getTodayString();
  const todaysResults = appState.results[today] || {};
  const listContainer = document.getElementById('summary-list');
  listContainer.innerHTML = '';

  playlist.forEach((game, index) => {
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
  initPreferences();
  checkRemovedGames();
  updateSettingsBadges();
  renderApp();
});

// Gate Screen Start Button
document.getElementById('btn-gate-start').addEventListener('click', () => {
  hasUserGesture = true;
  renderApp();
});

// Subset adjustment buttons
document.getElementById('btn-subset-minus').addEventListener('click', () => {
  if (appState.preferences && appState.preferences.subsetSize > 1) {
    appState.preferences.subsetSize--;
    saveState();
    invalidatePlaylistCache();
    renderGate();
  }
});

document.getElementById('btn-subset-plus').addEventListener('click', () => {
  const enabledCount = (appState.preferences?.enabledGames || []).length;
  if (appState.preferences && appState.preferences.subsetSize < enabledCount) {
    appState.preferences.subsetSize++;
    saveState();
    invalidatePlaylistCache();
    renderGate();
  }
});

// Settings navigation
let settingsReturnScreen = 'gate'; // Track where to return to

function openSettings(fromScreen) {
  settingsReturnScreen = fromScreen;
  renderSettings();
  showScreen('settings');
}

function closeSettings() {
  // Invalidate cached playlist so changes take effect
  invalidatePlaylistCache();
  
  if (settingsReturnScreen === 'gate') {
    renderApp();
  } else {
    renderSummary();
  }
}

function getUnseenGames() {
  if (!appState.preferences || !appState.preferences.seenGameIds) {
    return [];
  }
  return PLAYLIST_CONFIG.filter(g => !appState.preferences.seenGameIds.includes(g.id));
}

function updateSettingsBadges() {
  const unseen = getUnseenGames();
  const hasBadge = unseen.length > 0;
  
  const gateBadge = document.getElementById('gate-settings-badge');
  const summaryBadge = document.getElementById('summary-settings-badge');
  
  if (gateBadge) gateBadge.classList.toggle('hidden', !hasBadge);
  if (summaryBadge) summaryBadge.classList.toggle('hidden', !hasBadge);
}

function markAllGamesSeen() {
  if (!appState.preferences) initPreferences();
  appState.preferences.seenGameIds = PLAYLIST_CONFIG.map(g => g.id);
  saveState();
  updateSettingsBadges();
}

function checkRemovedGames() {
  if (!appState.preferences) return;
  
  const configIds = PLAYLIST_CONFIG.map(g => g.id);
  const removedFromEnabled = appState.preferences.enabledGames.filter(id => !configIds.includes(id));
  const removedFromOrder = appState.preferences.gameOrder.filter(id => !configIds.includes(id));
  
  if (removedFromEnabled.length > 0 || removedFromOrder.length > 0) {
    // Clean up preferences
    appState.preferences.enabledGames = appState.preferences.enabledGames.filter(id => configIds.includes(id));
    appState.preferences.gameOrder = appState.preferences.gameOrder.filter(id => configIds.includes(id));
    
    // Show notice (only once per session)
    if (!window._removedGamesNoticeShown) {
      window._removedGamesNoticeShown = true;
      const names = [...removedFromEnabled, ...removedFromOrder]
        .filter((id, i, arr) => arr.indexOf(id) === i) // unique
        .join(', ');
      alert(`Some games have been removed from the playlist: ${names}\n\nYour settings have been updated.`);
    }
    
    saveState();
  }
}

function renderSettings() {
  const gameList = document.getElementById('settings-game-list');
  
  // Get user preferences or use defaults
  const prefs = appState.preferences || { 
    enabledGames: PLAYLIST_CONFIG.map(g => g.id),
    gameOrder: PLAYLIST_CONFIG.map(g => g.id),
    randomizeOrder: false,
    randomSubset: false,
    subsetSize: 5
  };
  
  // Render game items in user's order
  const orderedGames = prefs.gameOrder
    .map(id => PLAYLIST_CONFIG.find(g => g.id === id))
    .filter(Boolean);
  
  // Add any new games not in user's order
  PLAYLIST_CONFIG.forEach(g => {
    if (!orderedGames.find(og => og.id === g.id)) {
      orderedGames.push(g);
    }
  });
  const unseenIds = getUnseenGames().map(g => g.id);
  
  gameList.innerHTML = orderedGames.map(game => {
    const isEnabled = prefs.enabledGames.includes(game.id);
    const isNew = unseenIds.includes(game.id);
    const metaTags = [
      game.openInNewTab ? '<span class="game-meta">New Tab</span>' : '',
      game.paidSubscription ? `<span class="game-meta paid" title="${game.paidSubscription}">Paid</span>` : '',
      isNew ? '<span class="game-meta new">NEW</span>' : ''
    ].filter(Boolean).join('');
    return `
      <div class="settings-game-item ${isEnabled ? '' : 'disabled'}" data-id="${game.id}" draggable="true">
        <span class="drag-handle">☰</span>
        <input type="checkbox" ${isEnabled ? 'checked' : ''} data-game-id="${game.id}">
        <span class="game-name">${game.name}</span>
        ${metaTags}
      </div>
    `;
  }).join('');
  
  // Mark all games as seen
  markAllGamesSeen();
  
  // Set toggle states
  document.getElementById('setting-randomize-order').checked = prefs.randomizeOrder || false;
  document.getElementById('setting-random-subset').checked = prefs.randomSubset || false;
  document.getElementById('setting-subset-size').value = prefs.subsetSize || 5;
  document.getElementById('subset-size-display').textContent = prefs.subsetSize || 5;
  
  // Show/hide subset size slider
  const subsetControl = document.getElementById('subset-size-control');
  subsetControl.classList.toggle('hidden', !prefs.randomSubset);
  
  // Update slider max based on enabled games
  const enabledCount = prefs.enabledGames.length;
  document.getElementById('setting-subset-size').max = enabledCount;
  
  // Set theme toggle
  document.getElementById('setting-dark-mode').checked = appState.theme === 'dark';
  
  // Attach drag handlers
  attachDragHandlers();
}

function attachDragHandlers() {
  const container = document.getElementById('settings-game-list');
  let draggedItem = null;
  
  container.querySelectorAll('.settings-game-item').forEach(item => {
    // Mouse drag events
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedItem = null;
      saveGameOrder();
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== item) {
        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          container.insertBefore(draggedItem, item);
        } else {
          container.insertBefore(draggedItem, item.nextSibling);
        }
      }
    });
    
    // Touch drag events (mobile)
    const handle = item.querySelector('.drag-handle');
    if (handle) {
      handle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        draggedItem = item;
        item.classList.add('dragging');
      }, { passive: false });
      
      handle.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!draggedItem) return;
        
        const touch = e.touches[0];
        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetItem = elemBelow?.closest('.settings-game-item');
        
        if (targetItem && targetItem !== draggedItem) {
          const rect = targetItem.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (touch.clientY < midY) {
            container.insertBefore(draggedItem, targetItem);
          } else {
            container.insertBefore(draggedItem, targetItem.nextSibling);
          }
        }
      }, { passive: false });
      
      handle.addEventListener('touchend', () => {
        if (draggedItem) {
          draggedItem.classList.remove('dragging');
          draggedItem = null;
          saveGameOrder();
        }
      });
    }
  });
}

function saveGameOrder() {
  const items = document.querySelectorAll('.settings-game-item');
  const order = Array.from(items).map(item => item.dataset.id);
  
  if (!appState.preferences) {
    appState.preferences = {
      enabledGames: PLAYLIST_CONFIG.map(g => g.id),
      gameOrder: order,
      randomizeOrder: false,
      randomSubset: false,
      subsetSize: 5
    };
  } else {
    appState.preferences.gameOrder = order;
  }
  saveState();
}

function initPreferences() {
  if (!appState.preferences) {
    appState.preferences = {
      enabledGames: PLAYLIST_CONFIG.map(g => g.id),
      gameOrder: PLAYLIST_CONFIG.map(g => g.id),
      seenGameIds: PLAYLIST_CONFIG.map(g => g.id),
      randomizeOrder: false,
      randomSubset: false,
      subsetSize: 5
    };
    saveState();
  }
}

// Settings button handlers
document.getElementById('btn-gate-settings').addEventListener('click', () => {
  openSettings('gate');
});

document.getElementById('btn-summary-settings').addEventListener('click', () => {
  openSettings('summary');
});

document.getElementById('btn-settings-back').addEventListener('click', () => {
  closeSettings();
});

document.getElementById('btn-settings-save').addEventListener('click', () => {
  saveState();
  closeSettings();
});

// Game enable/disable handlers
document.getElementById('settings-game-list').addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const gameId = e.target.dataset.gameId;
    const isEnabled = e.target.checked;
    
    if (!appState.preferences) initPreferences();
    
    if (isEnabled) {
      if (!appState.preferences.enabledGames.includes(gameId)) {
        appState.preferences.enabledGames.push(gameId);
      }
    } else {
      appState.preferences.enabledGames = appState.preferences.enabledGames.filter(id => id !== gameId);
    }
    
    // Prevent empty list
    if (appState.preferences.enabledGames.length === 0) {
      e.target.checked = true;
      appState.preferences.enabledGames.push(gameId);
      alert('You must have at least one game enabled.');
      return;
    }
    
    // Update slider max
    const enabledCount = appState.preferences.enabledGames.length;
    const slider = document.getElementById('setting-subset-size');
    slider.max = enabledCount;
    if (parseInt(slider.value) > enabledCount) {
      slider.value = enabledCount;
      document.getElementById('subset-size-display').textContent = enabledCount;
      appState.preferences.subsetSize = enabledCount;
    }
    
    // Update visual state
    e.target.closest('.settings-game-item').classList.toggle('disabled', !isEnabled);
    
    saveState();
  }
});

// Randomization toggles
document.getElementById('setting-randomize-order').addEventListener('change', (e) => {
  if (!appState.preferences) initPreferences();
  appState.preferences.randomizeOrder = e.target.checked;
  saveState();
});

document.getElementById('setting-random-subset').addEventListener('change', (e) => {
  if (!appState.preferences) initPreferences();
  appState.preferences.randomSubset = e.target.checked;
  document.getElementById('subset-size-control').classList.toggle('hidden', !e.target.checked);
  saveState();
});

document.getElementById('setting-subset-size').addEventListener('input', (e) => {
  if (!appState.preferences) initPreferences();
  const value = parseInt(e.target.value);
  appState.preferences.subsetSize = value;
  document.getElementById('subset-size-display').textContent = value;
  saveState();
});

// Theme toggle in settings
document.getElementById('setting-dark-mode').addEventListener('change', (e) => {
  appState.theme = e.target.checked ? 'dark' : 'light';
  applyTheme(appState.theme);
  saveState();
});

// Reset to defaults
document.getElementById('btn-reset-defaults').addEventListener('click', () => {
  if (confirm('Reset all settings to defaults? This will restore the original game list and order.')) {
    appState.preferences = {
      enabledGames: PLAYLIST_CONFIG.map(g => g.id),
      gameOrder: PLAYLIST_CONFIG.map(g => g.id),
      seenGameIds: PLAYLIST_CONFIG.map(g => g.id),
      randomizeOrder: false,
      randomSubset: false,
      subsetSize: 5
    };
    saveState();
    renderSettings();
  }
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
  const playlist = getTodaysPlaylist();
  const game = playlist[appState.currentIndex];
  // Mark as null to explicitly denote skipped today
  recordScore(game.id, null);
  appState.currentIndex++;
  saveState();
  renderApp();
});

document.getElementById('btn-submit').addEventListener('click', () => {
  const playlist = getTodaysPlaylist();
  const game = playlist[appState.currentIndex];
  document.getElementById('modal-title').textContent = `Submit Score for ${game.name}`;
  document.getElementById('score-input').value = '';
  document.getElementById('score-modal').classList.remove('hidden');
});

// New tab re-open
document.getElementById('btn-reopen-tab').addEventListener('click', () => {
  const playlist = getTodaysPlaylist();
  const game = playlist[appState.currentIndex];
  window.open(game.url, '_blank');
});

// Modal Logic
document.getElementById('btn-modal-cancel').addEventListener('click', () => {
  document.getElementById('score-modal').classList.add('hidden');
});

document.getElementById('btn-modal-save').addEventListener('click', () => {
  const input = document.getElementById('score-input').value.trim();
  if (input.length > 0) {
    const playlist = getTodaysPlaylist();
    const game = playlist[appState.currentIndex];
    recordScore(game.id, input);
    document.getElementById('score-modal').classList.add('hidden');
    
    // Find next game without data, or go to summary
    const nextIncomplete = findNextIncompleteGame();
    if (nextIncomplete === -1) {
      appState.currentIndex = playlist.length; // Triggers summary
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
  console.log('initDevPanel called, isDevelopment:', isDevelopment);
  if (!isDevelopment) return;
  
  const panel = document.getElementById('dev-panel');
  console.log('dev-panel element:', panel);
  if (!panel) {
    console.error('dev-panel element not found!');
    return;
  }
  panel.classList.remove('hidden');
  console.log('dev-panel hidden class removed');
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
      const button = e.target.closest('button');
      if (!button) return;
      const gameId = button.getAttribute('data-id');
      const action = button.getAttribute('data-action');
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
    const playlist = getTodaysPlaylist();
    appState.currentIndex = playlist.length;
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