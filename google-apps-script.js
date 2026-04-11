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
var LOGO_FOLDER_NAME = 'Pheasant Invitational Logos 2026';

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
  if (e.parameter.action === 'gg' && e.parameter.id) {
    var url = 'https://www.golfgenius.com/v2tournaments/' + e.parameter.id
      + '?called_from=widgets%2Fcustomized_tournament_results'
      + '&hide_totals=false&player_stats_for_portal=true';
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      return ContentService
        .createTextOutput(resp.getContentText())
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService
    .createTextOutput('Pheasant Invitational Registration API is active.')
    .setMimeType(ContentService.MimeType.TEXT);
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
