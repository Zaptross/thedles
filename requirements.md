---

# Product Requirements Document (PRD)

## Project: Daily "Dle" Playlist Dashboard

### 1. Overview

A lightweight, static single-page application (SPA) that acts as a sequential playlist for daily puzzle games (e.g., Wordle, Connections). The app orchestrates the user's daily puzzle routine by loading games one at a time, capturing their results, managing daily state across refreshes, and providing a unified sharing summary at the end of the playlist.

---

### 2. Architecture & Core Lifecycle

#### 2.1 Static Nature & Configuration

* The application must be completely static (HTML/CSS/JS) with no backend dependencies.
* The playlist configuration is hardcoded into the source code as a central JSON array of objects.

```json
[
  {
    "id": "wordle",
    "name": "Wordle",
    "url": "https://www.nytimes.com/games/wordle/index.html",
    "openInNewTab": true,
    "barPosition": "top"
  }
]

```

* **Empty State:** If the configuration array is empty on load, the application must display a clean placeholder screen instructing the user to populate the configuration array in the source code.

#### 2.2 Game State & Tracking

* **Progress Persistence:** Current progress (which game index the user is on) and submitted text results must be saved to `localStorage`. If the page is reloaded, the user must be brought back to their exact current step.
* **Midnight Reset:** Upon page load, or when transitioning between games, the app must check the current local system date. If the calendar date has advanced past the day of the last recorded game activity, progress must automatically reset to Game 1.
* **Historical Retention:** When a midnight reset occurs, the historical result text data from previous days must be preserved in `localStorage` rather than overwritten, allowing for future feature expansion. However, the UI does not need to display historical data at this time.

---

### 3. User Interface & Layout

#### 3.1 Theme & Appearance

* The system must support both Light and Dark themes.
* **Automatic Detection:** The application must automatically detect and apply the system theme using the `prefers-color-scheme` media query to prevent bright white screen flashes during night usage.
* **Manual Toggle:** The final summary screen must include a manual theme toggle button.

#### 3.2 Start/Resume Gate Screen

Due to browser popup blocking, games configured with `openInNewTab: true` cannot automatically open a new tab on page load without a user gesture.

* **Gate Screen:** When the current game requires a new tab and no user gesture has occurred this session, display a gate screen instead of immediately loading the game.
* **Contextual Messaging:** The gate screen text must adapt based on progress state:
  * Fresh start (game index 0, no results today): "Ready for your daily puzzles?" with "Start Playlist" button.
  * Resuming mid-playlist: "Welcome back!" with "Continue with {GameName}" button.
* **Playlist Preview:** Below the start button, display a numbered list of all games in today's playlist, visually indicating:
  * Completed games (with distinct styling)
  * The current game (bold/highlighted)
* **Bypass for Iframe Games:** If the current game does not require a new tab (loads in iframe), skip the gate and render the game directly.
* **Session Gesture Tracking:** Once the user clicks through the gate, set a session flag so navigating back to new-tab games mid-session does not re-gate.

#### 3.3 Main Game Viewing Screen

* By default, the active game must be loaded inside an iframe designed to take up **100% of the display area** (viewport height and width).
* **New Tab Security Fallback:** For games explicitly configured to break or block iframes (`"openInNewTab": true`), the application must display a friendly, clean placeholder screen (e.g., *"Playing 'Wordle' in a new tab..."*) and automatically open the target game link in a new browser tab.

#### 3.4 The Minimalist Control Bar

A persistent, highly compact user interface bar must float over the game display area.

* **Positioning:** Its vertical anchor (**top** or **bottom** aligned in the horizontal center) must be driven dynamically by the game's `barPosition` property in the configuration array to prevent clipping vital game menus.
* **Controls:** The bar must display the current game's `"name"`, alongside three interactive actions:
  1. **Back Button:** Steps the playlist back to the previous game index to review or modify a score.
  2. **Submit Score Button:** Launches the Score Submission Modal.
  3. **Skip Button:** Advances the user to the next game immediately without requiring a score.

#### 3.5 Footer

* A persistent footer must be displayed at the bottom of all screens.
* The footer must include:
  * Attribution text indicating the site was built with AI.
  * A link to the source code repository.

---

### 4. Interactions & Data Input

#### 4.1 Score Submission Modal

* Clicking the "Submit Score" button on the control bar opens a clean modal popup.
* The modal must explicitly state the name of the active game being submitted (e.g., *"Submit Score for Wordle"*).
* The input field is a standard text area that accepts **any text** pasted into it (operating on an honor system with no pattern or regex validation required), so long as it is not empty.
* Submitting the modal saves the text to `localStorage` under the current day's log.

#### 4.2 Smart Navigation After Submission

* After submitting a score, the application must find the next game in the playlist that does not yet have data for today.
* If all games have data, navigate directly to the Summary Screen.
* This allows users to complete games out of order and automatically skip already-completed games.

#### 4.3 Skip & Back Mechanics

* If a game is skipped, the user is advanced forward.
* If a user navigates backwards to a skipped game, or if they reach the final summary screen, they must be able to view their skipped status and click a button to go back and complete/submit a result for that specific game.

---

### 5. Final Summary Screen

Once all configured games in the playlist are completed or skipped for the day, the application must bypass the playlist loop on subsequent loads and jump straight to a dedicated **Summary Screen**.

#### 5.1 Elements on the Summary Screen

* **Individual Copy Buttons:** A dedicated list of all games played today, displaying their respective pasted results alongside an individual "Copy" button for that specific score.
* **Skipped Game Remediation:** Any game that was skipped during the playlist run should be clearly marked as "Skipped" with a "Play Game" button next to it, allowing the user to jump back and submit a score for it.
* **The "Copy All" Master Button:** A prominent button that bundles all available puzzle results from the day into a single clipboard copy operation.
* **Text Formatting Rule:** When copying all results, the app must join the texts together sequentially, inserting exactly **two blank lines** between each game's score block.
* **Theme Switcher:** The manual theme toggle button resides here.

---

### 6. Mobile & iOS Optimizations

The application must be optimized for mobile devices, particularly iOS Safari.

#### 6.1 Viewport & Layout

* Use dynamic viewport units (`100dvh`) with fallback to `100vh` to account for iOS Safari's address bar.
* Apply `viewport-fit=cover` to enable safe area insets.
* Respect safe area insets (`env(safe-area-inset-*)`) for the control bar and footer to avoid overlap with notches and home indicators on modern iPhones.

#### 6.2 Input Handling

* All text inputs and textareas must have a minimum font size of 16px to prevent iOS Safari's automatic zoom on focus.
* Apply `-webkit-tap-highlight-color: transparent` to remove the default tap highlight.
* Apply `touch-action: manipulation` to eliminate the 300ms double-tap delay.

#### 6.3 PWA Support

* Include Apple-specific meta tags for "Add to Home Screen" functionality:
  * `apple-mobile-web-app-capable`
  * `apple-mobile-web-app-status-bar-style`
  * `theme-color` (with light/dark variants via media query)

#### 6.4 Scroll Behavior

* Apply `overscroll-behavior: none` to prevent pull-to-refresh from interfering with the application.

---

### 7. Development Tools

A development panel is available when running the application locally (hostname is `localhost` or `127.0.0.1`).

#### 7.1 Dev Panel Location & Visibility

* The panel floats on the right side of the screen.
* It is only visible in development mode; production deployments do not display it.

#### 7.2 Dev Panel Controls

* **Per-Game Clear Buttons:** A button for each configured game that clears only that game's data for today.
* **Skip to Summary:** Immediately navigate to the Summary Screen regardless of progress.
* **Clear All Today:** Reset all game results for today and return to game index 0.
* **Clear All History:** Wipe all historical data from `localStorage` (with confirmation prompt).

---

### 8. Settings & Customization

Users can customize their playlist through a dedicated settings interface.

#### 8.1 Settings Access

* **Gate Screen:** A settings button appears above the playlist preview.
* **Summary Screen:** A settings button appears below the "Copy All Results" button.
* **No Mid-Playlist Access:** Settings cannot be changed while actively playing through the playlist.

#### 8.2 Settings UI

* **Full-Page Layout:** Settings open as a dedicated full-page screen, not a modal or drawer.
* **Theme Toggle:** The theme switcher (previously on summary only) moves to the settings page.
* **Reset to Defaults:** A button to restore the original playlist configuration.

#### 8.3 Game List Management

* **Enable/Disable Toggles:** Each game has a checkbox to include or exclude it from the playlist.
* **Drag-to-Reorder:** Users can reorder games via drag-and-drop; order is persisted to `localStorage`.
* **Hidden When Disabled:** Disabled games do not appear in the playlist preview; numbering reflects only enabled games.
* **Empty State Prevention:** Users cannot save settings with zero games enabled; the settings page forces them to enable at least one.
* **Game Metadata:** Each game row displays metadata such as "Opens in new tab" indicator.

#### 8.4 New Game Discovery

* **Default State:** When new games are added to the master configuration, they default to **disabled** for returning users with existing preferences.
* **New Game Indicator:** A dot/badge appears on the settings button when new (unseen) games are available.
* **Seen Tracking:** The application stores a list of game IDs the user has seen in settings, clearing the badge once they open settings.

#### 8.5 Removed Game Handling

* If a game is removed from the master configuration, users who had it enabled receive a **one-time notice** informing them of the removal.

---

### 9. Randomization Modes

Optional modes to vary the daily playlist experience.

#### 9.1 Randomize Order Mode

* **Toggle:** An optional setting to shuffle the order of enabled games.
* **Timing:** Shuffle occurs on **first load each day** (not mid-session).
* **Seed:** Uses a date-based seed (user's local date) for cross-device consistency—same date produces same order.

#### 9.2 Random Subset Mode

* **Toggle:** An optional setting to play a random subset of enabled games each day.
* **Subset Size:** Configured via a slider with numeric display; minimum 1, maximum capped at enabled game count.
* **Warning:** If subset size exceeds enabled games, warn the user to enable more games or reduce subset size.
* **Seed:** Uses a date-based seed (user's local date) for cross-device consistency.
* **Algorithm:** Shuffle all enabled games first, then pick the top N.

#### 9.3 Random Subset Preview

* **Picked Games:** Shown normally in the playlist preview.
* **Non-Picked Games:** Shown greyed out below the picked games.
* **Add Button (+):** Greyed-out games have a "+" button to add them to today's playlist (temporary, today only).
* **Remove Button (-):** Picked games have a "-" button to remove them from today's playlist (temporary, today only).
* **Button Visibility:** +/- buttons only appear when random subset mode is enabled; hidden when subset size equals enabled count.

#### 9.4 Mid-Day Changes

* **Adding Games:** Adding a greyed-out game via "+" persists only for today; does not change subset size setting.
* **Disabling Picked Games:** If a user disables a picked game via settings, it is removed from today's picks and a replacement is auto-selected from the remaining enabled pool.
* **Picks Preserved:** Today's picks (minus any disabled) are preserved if the user changes their enabled list mid-day.

#### 9.5 Compatibility

* Randomize Order and Random Subset modes can be enabled simultaneously.
* When both are enabled: shuffle all enabled games, pick top N for subset, display in shuffled order.

---

### 10. Additional Games

The following games are to be added to the master configuration. Iframe compatibility and bar position to be determined during implementation via interactive testing.

| Game | URL | Notes |
|------|-----|-------|
| Strands | (NYT Strands URL) | TBD: iframe/newTab, barPosition |
| Worldle | https://worldle.teuteuf.fr/ | TBD: iframe/newTab, barPosition |
| Globle | https://globle-game.com/ | TBD: iframe/newTab, barPosition |

---

### 11. Bug Fixes

#### 11.1 Modal Placeholder Text

* The score submission modal placeholder currently shows "Wordle 1000 4/6..." regardless of the active game.
* **Fix:** Either use a generic placeholder (e.g., "Paste your result here...") or dynamically set a per-game placeholder.
