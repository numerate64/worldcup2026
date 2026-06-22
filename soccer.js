const FAVORITES_KEY = 'worldCup2026Favorites.v1';
const SHOW_COMPLETED_KEY = 'worldCup2026ShowCompleted.v1';
const THEME_KEY = 'worldCup2026Theme.v1';
const SCORE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const KNOCKOUT_STAGES = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Third Place', 'Final'];
const BRACKET_STAGES = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final'];
const BRACKET_STAGE_LABELS = {
  'Round of 32': 'Round of 32',
  'Round of 16': 'Round of 16',
  Quarterfinals: 'Quarter-finals',
  Semifinals: 'Semi-finals',
  Final: 'Final'
};
const TEAM_FLAGS = {
  Algeria: '🇩🇿',
  Argentina: '🇦🇷',
  Australia: '🇦🇺',
  Austria: '🇦🇹',
  Belgium: '🇧🇪',
  'Bosnia & Herzegovina': '🇧🇦',
  Brazil: '🇧🇷',
  Canada: '🇨🇦',
  'Cabo Verde': '🇨🇻',
  'Cape Verde': '🇨🇻',
  Colombia: '🇨🇴',
  Croatia: '🇭🇷',
  Curaçao: '🇨🇼',
  'Czech Republic': '🇨🇿',
  'DR Congo': '🇨🇩',
  Ecuador: '🇪🇨',
  Egypt: '🇪🇬',
  England: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Ghana: '🇬🇭',
  Haiti: '🇭🇹',
  Iran: '🇮🇷',
  Iraq: '🇮🇶',
  'Ivory Coast': '🇨🇮',
  Japan: '🇯🇵',
  Jordan: '🇯🇴',
  Mexico: '🇲🇽',
  Morocco: '🇲🇦',
  Netherlands: '🇳🇱',
  'New Zealand': '🇳🇿',
  Norway: '🇳🇴',
  Panama: '🇵🇦',
  Paraguay: '🇵🇾',
  Portugal: '🇵🇹',
  Qatar: '🇶🇦',
  'Saudi Arabia': '🇸🇦',
  Scotland: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  Senegal: '🇸🇳',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  Spain: '🇪🇸',
  Sweden: '🇸🇪',
  Switzerland: '🇨🇭',
  Tunisia: '🇹🇳',
  Turkey: '🇹🇷',
  USA: '🇺🇸',
  Uruguay: '🇺🇾',
  Uzbekistan: '🇺🇿'
};

const TEAM_NAME_OVERRIDES = {
  'Cape Verde': 'Cabo Verde'
};

let matches = [];
let sources = [];
let favorites = loadFavorites();
let dataPublishedAt = null;
let lastCheckedAt = null;
let currentView = 'schedule';
let pointsSort = { key: 'group', direction: 'asc' };

const els = {
  matchRows: document.getElementById('matchRows'),
  teamFilter: document.getElementById('teamFilter'),
  dateFilter: document.getElementById('dateFilter'),
  stageFilter: document.getElementById('stageFilter'),
  venueFilter: document.getElementById('venueFilter'),
  favoritesOnly: document.getElementById('favoritesOnly'),
  showCompleted: document.getElementById('showCompleted'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  themeLabel: document.getElementById('themeLabel'),
  scheduleControls: document.getElementById('scheduleControls'),
  resetFilters: document.getElementById('resetFilters'),
  refreshScores: document.getElementById('refreshScores'),
  exportCsv: document.getElementById('exportCsv'),
  exportXls: document.getElementById('exportXls'),
  exportIcs: document.getElementById('exportIcs'),
  visibleCount: document.getElementById('visibleCount'),
  dataNote: document.getElementById('dataNote'),
  soccerPulse: document.getElementById('soccerPulse'),
  matchCount: document.getElementById('matchCount'),
  favoriteCount: document.getElementById('favoriteCount'),
  sourceList: document.getElementById('sourceList'),
  scoreRows: document.getElementById('scoreRows'),
  pointsRows: document.getElementById('pointsRows'),
  pointsSortButtons: [...document.querySelectorAll('.points-sort')],
  bracketBoard: document.getElementById('bracketBoard'),
  viewTabs: [...document.querySelectorAll('.view-tab')],
  viewPanels: [...document.querySelectorAll('[data-view-panel]')]
};

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

function loadShowCompleted() {
  return localStorage.getItem(SHOW_COMPLETED_KEY) === 'true';
}

function saveShowCompleted() {
  localStorage.setItem(SHOW_COMPLETED_KEY, String(els.showCompleted.checked));
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme, { save = true } = {}) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  const isLight = nextTheme === 'light';
  document.documentElement.dataset.theme = nextTheme;
  els.themeToggle.setAttribute('aria-pressed', String(isLight));
  els.themeToggle.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} mode`);
  els.themeIcon.textContent = isLight ? '🌙' : '☀️';
  els.themeLabel.textContent = isLight ? 'Dark mode' : 'Light mode';
  if (save) localStorage.setItem(THEME_KEY, nextTheme);
}

function html(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function displayTeamName(team) {
  const trimmed = String(team || '').trim();
  return TEAM_NAME_OVERRIDES[trimmed] || trimmed;
}

function displayMatchup(matchup) {
  const teams = splitTeams(matchup);
  if (teams.length < 2) return displayTeamName(matchup);
  return teams.join(' vs ');
}

function flagForTeam(team) {
  const displayName = displayTeamName(team);
  return TEAM_FLAGS[displayName] || TEAM_FLAGS[String(team || '').trim()] || '';
}

function teamText(team) {
  const displayName = displayTeamName(team);
  const flag = flagForTeam(team);
  return [flag, displayName].filter(Boolean).join(' ');
}

function teamHtml(team) {
  const displayName = displayTeamName(team);
  const flag = flagForTeam(team);
  if (!flag) return html(displayName);
  return `<span class="team-label"><span class="team-flag" aria-hidden="true">${html(flag)}</span><span>${html(displayName)}</span></span>`;
}

function matchupHtml(matchup) {
  const teams = splitTeams(matchup);
  if (teams.length < 2) return html(matchup);
  return `${teamHtml(teams[0])}<span class="match-vs">vs</span>${teamHtml(teams[1])}`;
}

function statusClass(status) {
  const normalized = normalize(status);
  if (normalized.includes('final')) return 'is-final';
  if (normalized.includes('live')) return 'is-live';
  if (normalized.includes('awaiting')) return 'is-awaiting';
  return 'is-scheduled';
}

function optionList(values, label) {
  return [`<option value="">${label}</option>`, ...values.map(value => (
    `<option value="${html(value)}">${html(value)}</option>`
  ))].join('');
}

function populateFilters() {
  els.stageFilter.innerHTML = optionList([...new Set(matches.map(match => match.stage).filter(Boolean))], 'All stages');
  els.venueFilter.innerHTML = optionList([...new Set(matches.map(match => match.venue).filter(Boolean))].sort(), 'All venues');
}

function renderSources() {
  els.sourceList.innerHTML = sources.map(source => (
    `<li>
      <a href="${html(source.url)}" target="_blank" rel="noreferrer">${html(source.name)}</a>
      <span>${html(source.publisher)} · ${html(source.usedFor)}</span>
    </li>`
  )).join('');
}

function formatDate(match) {
  const date = new Date(match.kickoffEt);
  if (Number.isNaN(date.getTime())) return match.date;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function normalize(text) {
  return String(text || '').toLowerCase();
}

function splitTeams(matchup) {
  return String(matchup || 'TBD vs. TBD')
    .replace(/^Third-place match:\s*/i, '')
    .split(/\s+vs\.?\s+/i)
    .map(team => displayTeamName(team))
    .filter(Boolean)
    .slice(0, 2);
}

function scoreValue(match, index) {
  const score = match.score || match.scores || {};
  const keys = index === 0
    ? ['home', 'homeScore', 'team1', 'team1Score', 'a', 'aScore']
    : ['away', 'awayScore', 'team2', 'team2Score', 'b', 'bScore'];
  for (const key of keys) {
    if (score[key] !== undefined && score[key] !== null && score[key] !== '') return score[key];
  }
  if (Array.isArray(score) && score[index] !== undefined) return score[index];
  return null;
}

function matchStatus(match) {
  if (match.status) return match.status;
  const kickoff = new Date(match.kickoffEt);
  if (Number.isNaN(kickoff.getTime())) return 'Scheduled';
  const now = Date.now();
  if (now < kickoff.getTime()) return 'Scheduled';
  if (now < kickoff.getTime() + 2 * 60 * 60 * 1000) return 'Live';
  return 'Awaiting score';
}

function formatScore(match) {
  const teams = splitTeams(match.matchup);
  const homeScore = scoreValue(match, 0);
  const awayScore = scoreValue(match, 1);
  if (homeScore === null || awayScore === null) return 'Score pending';
  return `${teamText(teams[0] || 'Team 1')} ${homeScore} - ${awayScore} ${teamText(teams[1] || 'Team 2')}`;
}

function numericScore(match, index) {
  const value = scoreValue(match, index);
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function groupStandings() {
  const standings = new Map();

  function ensureTeam(group, team) {
    const key = `${group}::${team}`;
    if (!standings.has(key)) {
      standings.set(key, {
        group,
        team,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      });
    }
    return standings.get(key);
  }

  matches
    .filter(match => match.stage === 'Group Stage' && match.group)
    .forEach(match => {
      const teams = splitTeams(match.matchup);
      if (teams.length < 2 || teams.some(team => /^TBD$/i.test(team))) return;

      const first = ensureTeam(match.group, teams[0]);
      const second = ensureTeam(match.group, teams[1]);
      const firstScore = numericScore(match, 0);
      const secondScore = numericScore(match, 1);

      if (firstScore === null || secondScore === null) return;

      first.played += 1;
      second.played += 1;
      first.goalsFor += firstScore;
      first.goalsAgainst += secondScore;
      second.goalsFor += secondScore;
      second.goalsAgainst += firstScore;

      if (firstScore > secondScore) {
        first.wins += 1;
        second.losses += 1;
        first.points += 3;
      } else if (firstScore < secondScore) {
        second.wins += 1;
        first.losses += 1;
        second.points += 3;
      } else {
        first.draws += 1;
        second.draws += 1;
        first.points += 1;
        second.points += 1;
      }

      first.goalDifference = first.goalsFor - first.goalsAgainst;
      second.goalDifference = second.goalsFor - second.goalsAgainst;
    });

  return [...standings.values()].sort((a, b) => (
    a.group.localeCompare(b.group, undefined, { numeric: true })
    || b.points - a.points
    || b.goalDifference - a.goalDifference
    || b.goalsFor - a.goalsFor
    || a.team.localeCompare(b.team)
  ));
}

function refreshMessage(prefix = '') {
  const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  const timeFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  const published = dataPublishedAt && !Number.isNaN(dataPublishedAt.getTime())
    ? dateTimeFormat.format(dataPublishedAt)
    : 'unavailable';
  const checked = lastCheckedAt
    ? timeFormat.format(lastCheckedAt)
    : 'not yet';
  return `${prefix}Data published ${published}. Page checked ${checked}. Checks every 5 minutes.`;
}

function filterDate(match) {
  const date = new Date(match.kickoffEt);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getFilteredMatches() {
  const team = normalize(els.teamFilter.value).trim();
  const date = els.dateFilter.value;
  const stage = els.stageFilter.value;
  const venue = els.venueFilter.value;

  return matches.filter(match => {
    if (stage && match.stage !== stage) return false;
    if (venue && match.venue !== venue) return false;
    if (date && filterDate(match) !== date) return false;
    if (els.favoritesOnly.checked && !favorites.has(match.id)) return false;
    if (!els.showCompleted.checked && hasBeenPlayed(match)) return false;
    if (!team) return true;

    return [
      match.matchup,
      displayMatchup(match.matchup)
    ].some(value => normalize(value).includes(team));
  }).sort((a, b) => new Date(a.kickoffEt) - new Date(b.kickoffEt));
}

function render() {
  const filtered = getFilteredMatches();

  els.matchRows.innerHTML = filtered.map(match => {
    const isFavorite = favorites.has(match.id);
    const location = [match.venue, match.location].filter(Boolean).join(' · ');
    const group = match.group ? `<span class="match-group">${html(match.group)}</span>` : '';
    return `<tr class="${hasScore(match) ? 'is-complete' : ''}">
      <td>
        <button class="favorite-button${isFavorite ? ' is-favorite' : ''}" type="button" data-id="${match.id}" onclick="toggleFavorite('${match.id}')" aria-label="${isFavorite ? 'Remove favorite' : 'Add favorite'}">${isFavorite ? '★' : '☆'}</button>
      </td>
      <td><strong>${html(formatDate(match))}</strong></td>
      <td>${html(match.timeEt)}</td>
      <td>${group}<span class="match-title">${matchupHtml(match.matchup)}</span></td>
      <td>${html(match.stage)}</td>
      <td>${html(location)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="empty-state">No matches match the current filters.</td></tr>';

  const standings = groupStandings();
  if (currentView === 'bracket') {
    els.visibleCount.textContent = `${matches.filter(match => KNOCKOUT_STAGES.includes(match.stage)).length} bracket matches shown`;
  } else if (currentView === 'points') {
    els.visibleCount.textContent = `${standings.length} teams with accumulated points shown`;
  } else {
    const label = currentView === 'scores' ? 'scores' : 'matches';
    const hiddenPlayed = els.showCompleted.checked ? 0 : matches.filter(hasBeenPlayed).length;
    const hiddenNote = hiddenPlayed ? ` · ${hiddenPlayed} played hidden` : '';
    els.visibleCount.textContent = `${filtered.length} of ${matches.length} ${label} shown${hiddenNote}`;
  }
  els.matchCount.textContent = `${matches.length} matches`;
  els.favoriteCount.textContent = `${favorites.size} favorite${favorites.size === 1 ? '' : 's'}`;
  renderPulse(standings);
  renderScores(filtered);
  renderPoints(standings);
  renderBracket();
}

function hasScore(match) {
  return numericScore(match, 0) !== null && numericScore(match, 1) !== null;
}

function hasBeenPlayed(match) {
  if (hasScore(match)) return true;
  const status = normalize(match.status);
  if (status.includes('final') || status.includes('complete') || status.includes('finished')) return true;
  const kickoff = new Date(match.kickoffEt).getTime();
  return Number.isFinite(kickoff) && Date.now() > kickoff + (2.5 * 60 * 60 * 1000);
}

function completedMatches() {
  return matches
    .filter(hasScore)
    .sort((a, b) => new Date(b.kickoffEt) - new Date(a.kickoffEt));
}

function upcomingMatches(limit = 1) {
  const now = Date.now();
  return matches
    .filter(match => !hasScore(match) && new Date(match.kickoffEt).getTime() >= now)
    .sort((a, b) => new Date(a.kickoffEt) - new Date(b.kickoffEt))
    .slice(0, limit);
}

function matchesAwaitingScores() {
  const scoreWindowMs = 2.5 * 60 * 60 * 1000;
  const now = Date.now();
  return matches.filter(match => {
    const kickoff = new Date(match.kickoffEt).getTime();
    return !hasScore(match) && Number.isFinite(kickoff) && now > kickoff + scoreWindowMs;
  });
}

function renderPulse(standings) {
  const finals = completedMatches();
  const next = upcomingMatches(1)[0];
  const awaiting = matchesAwaitingScores();
  const leader = standings
    .filter(row => row.played > 0)
    .sort((a, b) => (
      b.points - a.points
      || b.goalDifference - a.goalDifference
      || b.goalsFor - a.goalsFor
      || a.team.localeCompare(b.team)
    ))[0];
  const latest = finals[0];
  const latestText = latest ? formatScore(latest) : 'No finals yet';
  const nextText = next
    ? `${splitTeams(next.matchup).map(teamText).join(' vs ')} · ${formatDate(next)} ${next.timeEt}`
    : 'No upcoming fixtures';
  const leaderText = leader
    ? `${teamText(leader.team)} leads ${leader.group} (${leader.points} pts, ${leader.goalDifference > 0 ? '+' : ''}${leader.goalDifference})`
    : 'No group leader yet';

  els.soccerPulse.innerHTML = [
    pulseCard('Progress', `${finals.length} / ${matches.length}`, 'final scores recorded'),
    pulseCard('Latest Final', latestText, latest ? `${latest.stage}${latest.group ? ` · ${latest.group}` : ''}` : 'Waiting for results'),
    pulseCard('Top Group Team', leaderText, 'based only on completed group matches'),
    pulseCard('Next Up', nextText, next ? [next.venue, next.location].filter(Boolean).join(' · ') : 'Schedule complete'),
    pulseCard('Data Check', awaiting.length ? `${awaiting.length} pending` : 'Clean', awaiting.length ? 'past expected final window' : 'no overdue scores')
  ].join('');
}

function pulseCard(label, value, note) {
  return `<article class="pulse-card">
    <span>${html(label)}</span>
    <strong>${html(value)}</strong>
    <em>${html(note)}</em>
  </article>`;
}

function renderScores(filtered) {
  els.scoreRows.innerHTML = filtered.map(match => {
    const teams = splitTeams(match.matchup);
    const location = [match.venue, match.location].filter(Boolean).join(' · ');
    return `<tr>
      <td><span class="match-group">${html(match.id)}</span><span class="match-title">${matchupHtml(teams.join(' vs. ') || match.matchup)}</span></td>
      <td><span class="score-status ${html(statusClass(matchStatus(match)))}">${html(matchStatus(match))}</span></td>
      <td><strong>${html(formatScore(match))}</strong></td>
      <td>${html(match.stage)}</td>
      <td><strong>${html(formatDate(match))}</strong><span class="match-sub">${html(match.timeEt)}</span></td>
      <td>${html(location)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="empty-state">No scores match the current filters.</td></tr>';
}

function sortedStandings(standings) {
  const { key, direction } = pointsSort;
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...standings].sort((a, b) => {
    const first = a[key];
    const second = b[key];
    const comparison = typeof first === 'number'
      ? first - second
      : String(first).localeCompare(String(second), undefined, { numeric: true });
    if (comparison) return comparison * multiplier;

    if (key === 'group') {
      return b.points - a.points
        || b.goalDifference - a.goalDifference
        || b.goalsFor - a.goalsFor
        || a.team.localeCompare(b.team);
    }

    if (key === 'points') {
      return b.goalDifference - a.goalDifference
        || b.goalsFor - a.goalsFor
        || a.team.localeCompare(b.team);
    }

    return a.group.localeCompare(b.group, undefined, { numeric: true })
      || a.team.localeCompare(b.team);
  });
}

function updatePointsSortHeaders() {
  els.pointsSortButtons.forEach(button => {
    const active = button.dataset.sort === pointsSort.key;
    const header = button.closest('th');
    header.setAttribute('aria-sort', active
      ? (pointsSort.direction === 'asc' ? 'ascending' : 'descending')
      : 'none');
    button.classList.toggle('is-active', active);
  });
}

function renderPoints(standings) {
  updatePointsSortHeaders();
  els.pointsRows.innerHTML = sortedStandings(standings).map(row => `<tr>
    <td><span class="match-group">${html(row.group)}</span></td>
    <td><span class="match-title">${teamHtml(row.team)}</span></td>
    <td>${row.played}</td>
    <td>${row.wins}</td>
    <td>${row.draws}</td>
    <td>${row.losses}</td>
    <td>${row.goalsFor}</td>
    <td>${row.goalsAgainst}</td>
    <td>${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}</td>
    <td><strong>${row.points}</strong></td>
  </tr>`).join('') || '<tr><td colspan="10" class="empty-state">No completed group-stage matches yet.</td></tr>';
}

function setPointsSort(key) {
  if (pointsSort.key === key) {
    pointsSort.direction = pointsSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    pointsSort = {
      key,
      direction: key === 'group' || key === 'team' ? 'asc' : 'desc'
    };
  }
  render();
}

function renderBracket() {
  const knockoutMatches = matches.filter(match => KNOCKOUT_STAGES.includes(match.stage));
  const matchMap = new Map(knockoutMatches.map(match => [
    String(Number(match.id.replace(/\D/g, ''))),
    match
  ]));
  const orderedRounds = bracketRoundOrder(matchMap);
  const thirdPlace = knockoutMatches.find(match => match.stage === 'Third Place');

  els.bracketBoard.innerHTML = `
    <div class="bracket-tree">
      ${BRACKET_STAGES.map((stage, stageIndex) => {
        const stageMatches = orderedRounds.get(stage) || [];
        return `<section class="bracket-column bracket-column-${stageIndex + 1}" aria-label="${html(stage)}">
          <h3>
            <span>${html(BRACKET_STAGE_LABELS[stage] || stage)}</span>
            <small>${stageMatches.length} match${stageMatches.length === 1 ? '' : 'es'}</small>
          </h3>
          <div class="bracket-games">
            ${stageMatches.map((match, index) => renderBracketGame(
              match,
              bracketSlot(index, stageMatches.length),
              stageIndex,
              stage === 'Final'
            )).join('')}
          </div>
        </section>`;
      }).join('')}
    </div>
    ${thirdPlace ? `<section class="bracket-third-place" aria-label="Third place match">
      <div>
        <span class="bracket-eyebrow">Bronze medal match</span>
        <h3>Third Place</h3>
      </div>
      ${renderBracketGame(thirdPlace, 0, 0, true, true)}
    </section>` : ''}
  `;
}

function bracketRoundOrder(matchMap) {
  const ordered = new Map(BRACKET_STAGES.map(stage => [stage, []]));
  const seen = new Set();

  function visit(match) {
    if (!match || seen.has(match.id) || !ordered.has(match.stage)) return;
    const feeders = splitTeams(match.matchup)
      .map(team => team.match(/^W(\d+)$/i)?.[1])
      .filter(Boolean)
      .map(id => matchMap.get(id));

    feeders.forEach(visit);
    seen.add(match.id);
    ordered.get(match.stage).push(match);
  }

  const final = [...matchMap.values()].find(match => match.stage === 'Final');
  visit(final);

  BRACKET_STAGES.forEach(stage => {
    const unlinked = [...matchMap.values()]
      .filter(match => match.stage === stage && !seen.has(match.id))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    unlinked.forEach(match => {
      seen.add(match.id);
      ordered.get(stage).push(match);
    });
  });

  return ordered;
}

function bracketSlot(index, matchCount) {
  if (!matchCount) return 16;
  const spacing = 32 / matchCount;
  return (spacing / 2) + (index * spacing);
}

function renderBracketGame(match, slot = 0, stageIndex = 0, isLast = false, isStandalone = false) {
  const teams = splitTeams(match.matchup);
  const firstScore = scoreValue(match, 0);
  const secondScore = scoreValue(match, 1);
  const status = matchStatus(match);
  const branch = stageIndex > 0 ? (2 ** (stageIndex - 1)) : 0;
  const winnerIndex = firstScore !== null && secondScore !== null && firstScore !== secondScore
    ? (Number(firstScore) > Number(secondScore) ? 0 : 1)
    : -1;
  return `<article class="bracket-game${isStandalone ? ' is-standalone' : ''}" style="--slot:${slot};--branch:${branch}">
    <div class="bracket-meta">
      <span>${html(match.id)} · ${html(formatDate(match))}</span>
      <span>${html(match.timeEt)}</span>
    </div>
    <div class="bracket-team${winnerIndex === 0 ? ' is-winner' : ''}">
      <span class="bracket-team-name">${teamHtml(teams[0] || 'TBD')}</span>
      <strong>${html(firstScore ?? '-')}</strong>
    </div>
    <div class="bracket-team${winnerIndex === 1 ? ' is-winner' : ''}">
      <span class="bracket-team-name">${teamHtml(teams[1] || 'TBD')}</span>
      <strong>${html(secondScore ?? '-')}</strong>
    </div>
    <span class="bracket-status ${statusClass(status)}">${html(status)}</span>
    ${isLast ? '' : '<span class="bracket-outlet" aria-hidden="true"></span>'}
  </article>`;
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function exportRows() {
  return getFilteredMatches().map(match => ({
    favorite: favorites.has(match.id) ? 'Yes' : 'No',
    match: match.id,
    date: match.date,
    timeEt: match.timeEt,
    stage: match.stage,
    group: match.group,
    matchup: displayMatchup(match.matchup),
    venue: match.venue,
    location: match.location
  }));
}

function downloadFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const columns = ['Favorite', 'Match', 'Date', 'Time ET', 'Stage', 'Group', 'Matchup', 'Venue', 'Location'];
  const keys = ['favorite', 'match', 'date', 'timeEt', 'stage', 'group', 'matchup', 'venue', 'location'];
  const lines = [columns.map(csvCell).join(','), ...exportRows().map(row => keys.map(key => csvCell(row[key])).join(','))];
  downloadFile('world-cup-2026-matches.csv', 'text/csv;charset=utf-8', lines.join('\r\n'));
}

function exportXls() {
  const columns = ['Favorite', 'Match', 'Date', 'Time ET', 'Stage', 'Group', 'Matchup', 'Venue', 'Location'];
  const keys = ['favorite', 'match', 'date', 'timeEt', 'stage', 'group', 'matchup', 'venue', 'location'];
  const tableRows = exportRows().map(row => `<tr>${keys.map(key => `<td>${html(row[key])}</td>`).join('')}</tr>`).join('');
  const tableHead = columns.map(column => `<th>${html(column)}</th>`).join('');
  downloadFile('world-cup-2026-matches.xls', 'application/vnd.ms-excel;charset=utf-8', `<!doctype html><html><head><meta charset="utf-8"><title>World Cup 2026 Export</title></head><body><table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`);
}

function icsDate(value) {
  return new Date(value).toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
}

function icsEscape(value) {
  return String(value ?? '').replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\n', '\\n');
}

function exportIcs() {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OpenClaw//World Cup 2026//EN'];
  getFilteredMatches().forEach(match => {
    const start = new Date(match.kickoffEt);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${match.id}@worldcup2026.openclaw`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(match.kickoffEt)}`,
      `DTEND:${icsDate(end.toISOString())}`,
      `SUMMARY:${icsEscape(displayMatchup(match.matchup))}`,
      `LOCATION:${icsEscape([match.venue, match.location].filter(Boolean).join(', '))}`,
      `DESCRIPTION:${icsEscape(`${match.stage}${match.group ? ` - ${match.group}` : ''}`)}`,
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  downloadFile('world-cup-2026-matches.ics', 'text/calendar;charset=utf-8', lines.join('\r\n'));
}

function resetFilters() {
  els.teamFilter.value = '';
  els.dateFilter.value = '';
  els.stageFilter.value = '';
  els.venueFilter.value = '';
  els.favoritesOnly.checked = false;
  els.showCompleted.checked = false;
  saveShowCompleted();
  render();
}

function toggleFavorite(id) {
  if (!id) return;
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavorites();
  render();
}

function setView(view) {
  currentView = view;
  els.viewTabs.forEach(tab => tab.classList.toggle('is-active', tab.dataset.view === view));
  els.viewPanels.forEach(panel => panel.classList.toggle('is-hidden', panel.dataset.viewPanel !== view));
  els.scheduleControls.classList.toggle('is-hidden', false);
  render();
}

async function loadSoccerData({ manual = false } = {}) {
  if (manual) {
    els.refreshScores.disabled = true;
    els.dataNote.textContent = 'Checking the latest published data...';
  }

  try {
    const response = await fetch(`./world-cup-2026.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const data = await response.json();
    matches = Array.isArray(data.matches) ? data.matches : [];
    sources = Array.isArray(data.sources) ? data.sources : [];
    dataPublishedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    lastCheckedAt = new Date();
    if (Array.isArray(data.notes) && data.notes.length) {
      els.dataNote.textContent = `${data.notes.join(' ')} ${refreshMessage()}`;
    } else {
      els.dataNote.textContent = refreshMessage();
    }
    populateFilters();
    renderSources();
    render();
  } catch (error) {
    els.visibleCount.textContent = `Unable to load matches: ${error.message}`;
    els.dataNote.textContent = refreshMessage('Check failed. ');
  } finally {
    els.refreshScores.disabled = false;
  }
}

els.teamFilter.addEventListener('input', render);
[els.dateFilter, els.stageFilter, els.venueFilter, els.favoritesOnly].forEach(control => {
  control.addEventListener('change', render);
});
els.showCompleted.checked = loadShowCompleted();
els.showCompleted.addEventListener('change', () => {
  saveShowCompleted();
  render();
});
applyTheme(loadTheme(), { save: false });
els.themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});

els.resetFilters.addEventListener('click', resetFilters);
els.refreshScores.addEventListener('click', () => loadSoccerData({ manual: true }));
els.exportCsv.addEventListener('click', exportCsv);
els.exportXls.addEventListener('click', exportXls);
els.exportIcs.addEventListener('click', exportIcs);
els.viewTabs.forEach(tab => tab.addEventListener('click', () => setView(tab.dataset.view)));
els.pointsSortButtons.forEach(button => {
  button.addEventListener('click', () => setPointsSort(button.dataset.sort));
});

loadSoccerData();
setInterval(loadSoccerData, SCORE_REFRESH_INTERVAL_MS);
