const fs = require('fs');
const https = require('https');
const path = require('path');

const SOURCE_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const WORKSPACE_DIR = path.resolve(__dirname, '..');
const TARGET_PATH = path.join(WORKSPACE_DIR, 'world-cup-2026.json');

const TEAM_ALIASES = new Map([
  ['czechia', 'czech republic'],
  ['czech republic', 'czech republic'],
  ['turkiye', 'turkey'],
  ['türkiye', 'turkey'],
  ['turkey', 'turkey'],
  ['cabo verde', 'cabo verde'],
  ['cape verde', 'cabo verde'],
  ['congo dr', 'dr congo'],
  ['dr congo', 'dr congo'],
  ['curaçao', 'curacao'],
  ['curaçao', 'curacao'],
  ['curacao', 'curacao'],
  ['bosnia', 'bosnia & herzegovina'],
  ['bosnia and herzegovina', 'bosnia & herzegovina'],
  ['bosnia & herzegovina', 'bosnia & herzegovina']
]);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`Request failed with ${response.statusCode}`));
        response.resume();
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function readExisting() {
  try {
    return JSON.parse(fs.readFileSync(TARGET_PATH, 'utf8'));
  } catch {
    return { matches: [], sources: [] };
  }
}

function stripMarks(value) {
  return String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeTeam(value) {
  const normalized = stripMarks(value)
    .toLowerCase()
    .replace(/\band\b/g, '&')
    .replace(/[^a-z0-9&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return TEAM_ALIASES.get(normalized) || normalized;
}

function matchupKey(team1, team2) {
  return [normalizeTeam(team1), normalizeTeam(team2)].sort().join('::');
}

function displayTeamName(value) {
  if (!value) return 'TBD';
  if (normalizeTeam(value) === 'cabo verde') return 'Cabo Verde';
  return value;
}

function existingMetadata(existing) {
  const byMatchup = new Map();
  for (const match of existing.matches || []) {
    const teams = String(match.matchup || '').split(/\s+vs\.?\s+/i);
    if (teams.length >= 2) byMatchup.set(matchupKey(teams[0], teams[1]), match);
  }
  return { byMatchup };
}

function stageFromRound(round) {
  const value = String(round || '');
  if (/round of 32/i.test(value)) return 'Round of 32';
  if (/round of 16/i.test(value)) return 'Round of 16';
  if (/quarter/i.test(value)) return 'Quarterfinals';
  if (/semi/i.test(value)) return 'Semifinals';
  if (/third/i.test(value)) return 'Third Place';
  if (/final/i.test(value)) return 'Final';
  return 'Group Stage';
}

function parseSourceTime(date, time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2}))?$/i);
  if (!match) return { instant: null, kickoff: date || '', timeEt: time || '' };

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const offsetHours = Number(match[3] || 0);
  const utcMs = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    hour - offsetHours,
    minute
  );
  const instant = new Date(utcMs);
  const formattedEt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: minute === 0 ? undefined : '2-digit',
    hour12: true
  }).format(instant);
  const text = formattedEt
    .replace(/\s/g, ' ')
    .toLowerCase()
    .replace('am', 'a.m.')
    .replace('pm', 'p.m.');

  return { instant, kickoff: instant.toISOString(), timeEt: `${text} ET` };
}

function sourceScore(score) {
  const ft = score && Array.isArray(score.ft) ? score.ft : null;
  if (!ft || ft.length < 2) return null;
  return { home: ft[0], away: ft[1] };
}

function transformMatch(sourceMatch, index, metadata) {
  const id = `M${String(index + 1).padStart(3, '0')}`;
  const score = sourceScore(sourceMatch.score);
  const existing = metadata.byMatchup.get(matchupKey(sourceMatch.team1, sourceMatch.team2))
    || {};
  const timing = parseSourceTime(sourceMatch.date, sourceMatch.time);

  return {
    id,
    date: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York'
    }).format(timing.instant || new Date(`${sourceMatch.date}T12:00:00Z`)),
    timeEt: timing.timeEt,
    kickoffEt: timing.kickoff,
    sourceDate: sourceMatch.date,
    sourceTime: sourceMatch.time,
    stage: stageFromRound(sourceMatch.round),
    group: sourceMatch.group || '',
    matchup: `${displayTeamName(sourceMatch.team1)} vs ${displayTeamName(sourceMatch.team2)}`,
    venue: existing.venue || sourceMatch.ground || '',
    location: existing.location || sourceMatch.ground || '',
    source: 'openfootball/worldcup.json',
    ...(score ? { status: 'Final', score } : {}),
    ...(sourceMatch.score?.ht ? { halftimeScore: { home: sourceMatch.score.ht[0], away: sourceMatch.score.ht[1] } } : {}),
    ...(sourceMatch.goals1 || sourceMatch.goals2 ? {
      goals: {
        home: sourceMatch.goals1 || [],
        away: sourceMatch.goals2 || []
      }
    } : {})
  };
}

async function main() {
  const existing = readExisting();
  const source = await fetchJson(SOURCE_URL);
  const metadata = existingMetadata(existing);
  const matches = (source.matches || []).map((match, index) => transformMatch(match, index, metadata));
  const payload = {
    updatedAt: new Date().toISOString(),
    sourceUpdated: new Date().toISOString().slice(0, 10),
    canonicalSource: SOURCE_URL,
    notes: [
      'Fixtures and results are synced from openfootball/worldcup.json.',
      'openfootball is hand-maintained and not live; use the Data Check card to catch stale scores.'
    ],
    matches,
    sources: [
      {
        name: 'World Cup 2026 JSON',
        publisher: 'openfootball/worldcup.json',
        url: SOURCE_URL,
        usedFor: 'Canonical fixtures, teams, venues, kickoff source times, scores, and goals'
      }
    ],
    api: {
      endpoint: './world-cup-2026.json',
      aliases: [],
      queryParameters: ['search or q', 'stage', 'group', 'venue']
    }
  };

  fs.writeFileSync(TARGET_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Synced ${matches.length} matches from openfootball/worldcup.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
