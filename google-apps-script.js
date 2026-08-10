// ============================================================
// The Pheasant Invitational — Google Apps Script Backend
// Paste this into your Google Sheet's Apps Script editor:
//   Extensions > Apps Script > paste into Code.gs
//
// After pasting:
//   1. Run setupSheet() once to create tabs and protections
//   2. Deploy > New Deployment > Web App
//      - Execute as: Me
//      - Who has access: Anyone
//   3. Copy the deployment URL into app.js APPS_SCRIPT_URL
// ============================================================

var ORIGINAL_TAB_NAME = 'Original Data';
var WORKING_TAB_NAME = 'Working Copy';
var WAITLIST_TAB_NAME = 'Waitlist';
var LOGO_FOLDER_NAME = 'Pheasant Invitational Logos 2026';
var SPONSOR_FOLDER_NAME = 'Pheasant Invitational Sponsors';

var HEADERS = [
  'Timestamp',
  'Registration Type',
  'Member Email',
  'Member Name',
  'Membership Level',
  'Member GHIN',
  'Guest Name',
  'Guest GHIN',
  'Guest Email',
  'Guest Club',
  'Par 3 Contest',
  'Open Horse Race',
  'Saturday Additional Guests',
  'Deposit Acknowledged',
  'Sponsor Name',
  'Logo Link'
];

// --------------------------------------------------------
// Run this ONCE to initialize the sheet structure
// --------------------------------------------------------
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create or get tabs
  var origSheet = ss.getSheetByName(ORIGINAL_TAB_NAME) || ss.insertSheet(ORIGINAL_TAB_NAME);
  var workSheet = ss.getSheetByName(WORKING_TAB_NAME) || ss.insertSheet(WORKING_TAB_NAME);

  // Write headers
  origSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  workSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  // Bold and freeze header rows
  origSheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  origSheet.setFrozenRows(1);
  workSheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  workSheet.setFrozenRows(1);

  // Protect Original Data tab
  var protection = origSheet.protect().setDescription('Original Data - Script Only');
  var me = Session.getEffectiveUser();
  protection.addEditor(me);
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }

  // Create Drive folder for logos
  var folders = DriveApp.getFoldersByName(LOGO_FOLDER_NAME);
  if (!folders.hasNext()) {
    DriveApp.createFolder(LOGO_FOLDER_NAME);
  }

  Logger.log('Setup complete. Both tabs created, Original Data protected, logo folder ready.');
}

// --------------------------------------------------------
// Web App POST handler — receives form submissions
// --------------------------------------------------------
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Server-side validation
    if (!data.memberEmail || !data.memberName || !data.memberGhin ||
        !data.guestName || !data.guestGhin || !data.membershipLevel) {
      return createResponse('error', 'Missing required fields.');
    }

    if (data.registrationType === 'Sponsor') {
      if (!data.sponsorName) {
        return createResponse('error', 'Sponsor name is required for sponsor registration.');
      }
    }

    // Handle logo upload
    var logoLink = '';
    if (data.registrationType === 'Sponsor' && data.logoBase64 && data.logoFileName) {
      logoLink = uploadLogo(data.logoBase64, data.logoFileName, data.logoMimeType, data.memberName);
    }

    // Build row
    var timestamp = new Date();
    var row = [
      timestamp,
      data.registrationType,
      data.memberEmail,
      data.memberName,
      formatMembershipLevel(data.membershipLevel),
      data.memberGhin,
      data.guestName,
      data.guestGhin,
      data.guestEmail || '',
      data.guestClub || '',
      data.par3Contest || 'No',
      data.openHorseRace || 'No',
      data.saturdayAdditionalGuests || '0',
      data.depositAcknowledged || 'No',
      data.sponsorName || '',
      logoLink
    ];

    // Write to both tabs
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.getSheetByName(ORIGINAL_TAB_NAME).appendRow(row);
    ss.getSheetByName(WORKING_TAB_NAME).appendRow(row);

    // Send confirmation email
    sendConfirmationEmail(data, timestamp);

    return createResponse('success', 'Registration submitted successfully.');

  } catch (err) {
    Logger.log('Error in doPost: ' + err.toString());
    return createResponse('error', 'Server error: ' + err.message);
  }
}

// --------------------------------------------------------
// GET handler — proxy for Golf Genius API (bypasses browser CORS)
// Usage: ?action=gg&id=TOURNAMENT_ID
// --------------------------------------------------------
function doGet(e) {
  var base = 'https://www.golfgenius.com/v2tournaments/';
  var qs   = '?called_from=widgets%2Fcustomized_tournament_results&hide_totals=false&player_stats_for_portal=true';

  // JSON endpoint — aggregate totals
  if (e.parameter.action === 'gg' && e.parameter.id) {
    try {
      var resp = UrlFetchApp.fetch(base + e.parameter.id + qs, {
        muteHttpExceptions: true,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      });
      return ContentService.createTextOutput(resp.getContentText())
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // HTML endpoint — per-round data (parsed client-side)
  if (e.parameter.action === 'gg-html' && e.parameter.id) {
    try {
      var resp = UrlFetchApp.fetch(base + e.parameter.id + qs, {
        muteHttpExceptions: true,
        headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0' }
      });
      return ContentService.createTextOutput(resp.getContentText())
        .setMimeType(ContentService.MimeType.TEXT);
    } catch (err) {
      return ContentService.createTextOutput('')
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }

  // Detail endpoint — full match schedule per team (for head-to-head tiebreaker)
  if (e.parameter.action === 'gg-detail' && e.parameter.id) {
    try {
      var resp = UrlFetchApp.fetch('https://www.golfgenius.com/tournaments2/details/' + e.parameter.id, {
        muteHttpExceptions: true,
        headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0' }
      });
      return ContentService.createTextOutput(resp.getContentText())
        .setMimeType(ContentService.MimeType.TEXT);
    } catch (err) {
      return ContentService.createTextOutput('')
        .setMimeType(ContentService.MimeType.TEXT);
    }
  }

  // Schedule endpoint — fetches all team detail pages server-side (avoids browser CORS burst),
  // parses match rows, deduplicates, and returns consolidated JSON.
  // Usage: ?action=gg-schedule&id=TOURNAMENT_ID
  if (e.parameter.action === 'gg-schedule' && e.parameter.id) {
    try {
      // Step 1: Get team list from results JSON
      var jsonQs = '?called_from=widgets%2Fcustomized_tournament_results&hide_totals=false&player_stats_for_portal=true';
      var jsonResp = UrlFetchApp.fetch(base + e.parameter.id + jsonQs, {
        muteHttpExceptions: true,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      });
      var jsonData = JSON.parse(jsonResp.getContentText());
      var scopes = (jsonData.event && jsonData.event.scopes) || [];

      var teams = [];
      scopes.forEach(function(scope) {
        (scope.aggregates || []).forEach(function(agg) {
          teams.push({ id: agg.id_str, name: agg.name, flight: scope.name });
        });
      });

      // Step 2: Fetch all team detail pages in parallel (server-side, no CORS)
      var requests = teams.map(function(team) {
        return {
          url: 'https://www.golfgenius.com/tournaments2/details/' + team.id,
          muteHttpExceptions: true,
          headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0' }
        };
      });
      var responses = UrlFetchApp.fetchAll(requests);

      // Step 3: Parse and deduplicate matches
      var matchMap = {};
      var debugTeams = [];
      responses.forEach(function(resp, i) {
        var team = teams[i];
        var html = resp.getContentText();
        var entries = parseDetailHtmlGas(html);
        debugTeams.push({ name: team.name, htmlLen: html.length, matchCount: entries.length,
                          dates: entries.map(function(e) { return e.date; }) });
        entries.forEach(function(entry) {
          var pair = [team.name, entry.opponentName].sort();
          var key = entry.date + '|' + pair[0] + '|' + pair[1];
          if (!matchMap[key]) {
            var score = gasCompareResult(entry.result);
            matchMap[key] = {
              date:    entry.date,
              flight:  team.flight,
              home:    team.name,
              away:    entry.opponentName,
              homeWon: score === 1 ? team.name : score === -1 ? entry.opponentName : null,
              result:  entry.result
            };
          }
        });
      });

      // Collect to array
      var matchList = [];
      for (var k in matchMap) { matchList.push(matchMap[k]); }

      return ContentService.createTextOutput(JSON.stringify({ matches: matchList, debug: debugTeams }))
        .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Waitlist endpoint — reads from Waitlist tab
  if (e.parameter.action === 'waitlist') {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(WAITLIST_TAB_NAME);
      if (!sheet || sheet.getLastRow() < 2) {
        return ContentService.createTextOutput(JSON.stringify({ waitlist: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
      var waitlist = [];
      data.forEach(function(row) {
        var member = (row[0] || '').toString().trim();
        if (member) {
          waitlist.push({ member: member, guest: (row[1] || '').toString().trim() });
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ waitlist: waitlist }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Sponsors endpoint — lists all files in the Sponsors Drive folder
  // Manage sponsors by adding/removing files in that folder on Drive.
  if (e.parameter.action === 'sponsors') {
    try {
      var folders = DriveApp.getFoldersByName(SPONSOR_FOLDER_NAME);
      if (!folders.hasNext()) {
        return ContentService.createTextOutput(JSON.stringify({ sponsors: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var folder = folders.next();
      var files = folder.getFiles();
      var sponsors = [];
      while (files.hasNext()) {
        var file = files.next();
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        var id = file.getId();
        // Strip file extension for display name
        var displayName = file.getName().replace(/\.[^.]+$/, '');
        sponsors.push({
          name: displayName,
          url: 'https://lh3.googleusercontent.com/d/' + id
        });
      }
      // Sort alphabetically by sponsor name
      sponsors.sort(function(a, b) { return a.name.localeCompare(b.name); });
      return ContentService.createTextOutput(JSON.stringify({ sponsors: sponsors }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Resolve endpoint — auto-discovers the live tournament id from the
  // event's league portal, so the site can go live with no manual ID entry.
  // The league widget returns "No Tournaments Found" until GG builds the
  // leaderboard; once it does, the tournament id appears in the markup.
  // Usage: ?action=gg-resolve&league=LEAGUE_ID&page=PAGE_ID&exclude=id1,id2
  if (e.parameter.action === 'gg-resolve' && e.parameter.league) {
    try {
      var wUrl = 'https://www.golfgenius.com/leagues/' + e.parameter.league +
                 '/widgets/customized_tournament_results?page_id=' +
                 (e.parameter.page || '') + '&shared=false';
      var wResp = UrlFetchApp.fetch(wUrl, {
        muteHttpExceptions: true,
        headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0' }
      });
      var wHtml = wResp.getContentText();

      // Not built yet → tell the client to keep showing "Coming Soon".
      if (/No Tournaments Found/i.test(wHtml)) {
        return ContentService.createTextOutput(JSON.stringify({ ready: false }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Build an exclusion set (league / website / page ids are not the tournament id).
      var exclude = {};
      [e.parameter.league, e.parameter.page, e.parameter.exclude].forEach(function(x) {
        if (x) String(x).split(',').forEach(function(v) { exclude[v.trim()] = true; });
      });

      // Try known id-bearing patterns first, then fall back to any long numeric token.
      var patterns = [
        /v2tournaments\/(\d{15,})/,
        /tournaments2\/(?:details\/)?(\d{15,})/,
        /data-tournament-id=["'](\d{15,})["']/,
        /["']tournament_id["']\s*[:=]\s*["']?(\d{15,})/
      ];
      var tid = '';
      for (var i = 0; i < patterns.length && !tid; i++) {
        var m = wHtml.match(patterns[i]);
        if (m && !exclude[m[1]]) tid = m[1];
      }
      var candidates = [];
      (wHtml.match(/\d{18,20}/g) || []).forEach(function(n) {
        if (!exclude[n] && candidates.indexOf(n) === -1) candidates.push(n);
      });
      if (!tid && candidates.length) tid = candidates[0];

      return ContentService.createTextOutput(JSON.stringify({
        ready: true,
        tournamentId: tid,
        candidates: candidates.slice(0, 12)
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ ready: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput('Pheasant Invitational Registration API is active.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// --------------------------------------------------------
// Schedule helper — parse a team's detail HTML server-side
// Returns [{date, opponentName, result}]
// Extracts full <tr> blocks before stripping tags so that
// text from multiple <td>s within a row is concatenated
// correctly (mirrors what DOMParser.textContent does).
// --------------------------------------------------------
function parseDetailHtmlGas(html) {
  var entries = [];
  if (!html || html.length < 500) return entries;

  var currentDate     = null;
  var currentOpponent = null;
  var lastMatchTokens = [];

  // Extract each <tr>...</tr> block and process as a unit
  var trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    var rowHtml = trMatch[1];

    // Count <td> elements to detect hole-number rows
    var tdCount = (rowHtml.match(/<td/gi) || []).length;

    // Strip tags and decode common entities; collapse whitespace
    var text = rowHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

    if (text.indexOf('::') !== -1 && text.indexOf(' vs. ') !== -1) {
      if (tdCount > 8) continue; // hole-number row — skip

      if (currentOpponent !== null) {
        entries.push({ date: currentDate, opponentName: currentOpponent,
                       result: gasParseMatchResult(lastMatchTokens) });
      }
      var colonIdx = text.indexOf('::');
      currentDate = text.substring(0, colonIdx).trim();
      var vsIdx   = text.indexOf(' vs. ');
      currentOpponent = text.substring(vsIdx + 5).trim();
      lastMatchTokens = [];
    }
    else if (/^Match\b/.test(text) && currentOpponent !== null) {
      var tokens = text.replace(/^Match\s*/, '').trim().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) lastMatchTokens = tokens;
    }
  }

  if (currentOpponent !== null) {
    entries.push({ date: currentDate, opponentName: currentOpponent,
                   result: gasParseMatchResult(lastMatchTokens) });
  }
  return entries;
}

function gasParseMatchResult(tokens) {
  if (!tokens || !tokens.length) return '';
  var last = tokens[tokens.length - 1];
  var prev = tokens.length >= 2 ? tokens[tokens.length - 2] : '';
  if ((last === 'up' || last === 'dn') && /^\d+$/.test(prev)) return prev + ' ' + last;
  if (last === 'T') return 'T';
  return '';
}

function gasCompareResult(result) {
  var r = (result || '').trim();
  if (/ up$/.test(r)) return  1;
  if (/ dn$/.test(r)) return -1;
  return 0;
}

// --------------------------------------------------------
// Upload a base64-encoded logo to Google Drive
// --------------------------------------------------------
function uploadLogo(base64Data, fileName, mimeType, memberName) {
  try {
    var base64Content = base64Data.split(',')[1];
    if (!base64Content) return '';

    var decoded = Utilities.base64Decode(base64Content);
    var blob = Utilities.newBlob(decoded, mimeType || 'application/octet-stream');

    // Unique filename: MemberName_Timestamp_OriginalName
    var ts = Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyyMMdd_HHmmss');
    var safeName = memberName.replace(/[^a-zA-Z0-9]/g, '_');
    blob.setName(safeName + '_' + ts + '_' + fileName);

    // Get or create folder
    var folders = DriveApp.getFoldersByName(LOGO_FOLDER_NAME);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(LOGO_FOLDER_NAME);

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();

  } catch (err) {
    Logger.log('Logo upload error: ' + err.toString());
    return 'UPLOAD_FAILED: ' + err.message;
  }
}

// --------------------------------------------------------
// Helpers
// --------------------------------------------------------
function createResponse(status, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: status, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatMembershipLevel(code) {
  var map = {
    'proprietary_emeritus': 'Proprietary/Emeritus',
    'single_golfer': 'Single Golfer',
    'young_professional': 'Young Professional',
    'vertical': 'Vertical'
  };
  return map[code] || code;
}

function sendConfirmationEmail(data, timestamp) {
  try {
    var subject = 'Pheasant Invitational 2026 - Registration Received';
    var typeLabel = data.registrationType === 'Sponsor'
      ? 'Sponsor Registration' : 'Open Registration';

    var body = 'Dear ' + data.memberName + ',\n\n' +
      'Thank you for submitting your ' + typeLabel + ' for The Pheasant Invitational 2026.\n\n' +
      'Your registration has been logged at ' +
      Utilities.formatDate(timestamp, 'America/Los_Angeles', 'MMMM d, yyyy h:mm:ss a z') + '.\n\n' +
      'Registration Details:\n' +
      '- Team: ' + data.memberName + ' & ' + data.guestName + '\n' +
      '- Membership Level: ' + formatMembershipLevel(data.membershipLevel) + '\n';

    if (data.registrationType === 'Sponsor') {
      body += '- Sponsor: ' + data.sponsorName + '\n';
    }

    body += '\nPlease note that submitting this form does not guarantee a spot in the tournament. ' +
      'Accepted registrations will be processed in accordance with the registration procedure.\n\n' +
      'You will be contacted with next steps.\n\n' +
      'Best regards,\nThe Pheasant Invitational Committee\nEl Macero Country Club';

    MailApp.sendEmail(data.memberEmail, subject, body);

  } catch (err) {
    Logger.log('Email send error: ' + err.toString());
    // Non-fatal — registration still succeeded
  }
}
