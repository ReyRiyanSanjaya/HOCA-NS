/**
 * HCA NS Seeding Dashboard - Google Apps Script Backend
 * Deploy as Web App: Execute as Me, Access: Anyone
 *
 * NOTE: Google Apps Script TextOutput does NOT support addHeader().
 * CORS is handled automatically by GAS for Web Apps deployed as "Anyone".
 */

// ============================================================
// CONFIGURATION — Update these IDs
// ============================================================
var SPREADSHEET_ID   = '1hRR-fVMZLA8r-IJ9Q_-7W1ZTC3AK5NkhkXvcEjJ-SuY';
var SHEET_MASTER_BTS      = 'MASTER_BTS';
var SHEET_MASTER_PROMOTOR = 'MASTER_PROMOTOR';
var SHEET_MASTER_SPV      = 'MASTER_SPV';
var SHEET_TRANSACTION     = 'TRANSACTION';
var DRIVE_FOLDER_ID  = '1chrtgi5feeWB4HQmcJ2KToNHm9-ZKsgY'; // for photo uploads

// ============================================================
// RESPONSE HELPER
// ============================================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// MAIN GET HANDLER
// ============================================================
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  try {
    switch (action) {
      case 'master-bts':      return getMasterBTS(e);
      case 'master-promotor': return getMasterPromotor(e);
      case 'master-spv':      return getMasterSPV(e);
      case 'dashboard':       return getDashboard(e);
      case 'analytics':       return getAnalytics(e);
      case 'gallery':         return getGallery(e);
      case 'transactions':    return getTransactions(e);
      case 'map':             return getMapData(e);
      case 'bts-history':     return getBTSHistory(e);
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================
// MAIN POST HANDLER
// ============================================================
function doPost(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'transaction';
    if (action === 'transaction') return postTransaction(e);
    if (action === 'import')     return importMasterData(e);
    return jsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================================
// SHEET HELPERS
// ============================================================
function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return h ? h.toString().trim() : ''; });
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? row[i] : ''; });
    return obj;
  });
}

function parseFilter(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  return {
    dateFrom:    p.dateFrom    || '',
    dateTo:      p.dateTo      || '',
    supervisor:  p.supervisor  || '',
    promotor:    p.promotor    || '',
    brand:       p.brand       || '',
    kabupaten:   p.kabupaten   || '',
    cluster:     p.cluster     || '',
    pm:          p.pm          || '',
    statusTower: p.statusTower || '',
    keyword:     p.keyword     || ''
  };
}

// ──────────────────────────────────────────────────────────────────────────
// DATE HELPER: normalise any Tanggal value (Date object or string) to yyyy-MM-dd
// ──────────────────────────────────────────────────────────────────────────
function normDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  // Already a string — take first 10 chars (handles ISO and locale strings)
  return String(val).substring(0, 10);
}

function applyTransactionFilter(rows, f) {
  return rows.filter(function(r) {
    var tgl = normDate(r['Tanggal']);
    if (f.dateTo   && tgl > f.dateTo)   return false;
    if (f.supervisor && r['Supervisor'] !== f.supervisor) return false;
    if (f.promotor   && r['Promotor']   !== f.promotor)   return false;
    if (f.brand      && r['Brand']      !== f.brand)      return false;
    if (f.kabupaten) {
      var bts = getBTSById(r['ID BTS']);
      if (!bts || bts['Kabupaten'] !== f.kabupaten) return false;
    }
    if (f.keyword) {
      var kw = f.keyword.toLowerCase();
      if (JSON.stringify(r).toLowerCase().indexOf(kw) === -1) return false;
    }
    return true;
  });
}

// BTS in-memory cache (resets per execution)
var _btsCache = null;
function getAllBTS() {
  if (!_btsCache) {
    _btsCache = sheetToObjects(getSheet(SHEET_MASTER_BTS));
  }
  return _btsCache;
}

function getBTSById(id) {
  var list = getAllBTS();
  for (var i = 0; i < list.length; i++) {
    // support both old 'ID BTS' and new 'Tower ID' column names
    if (String(list[i]['Tower ID'] || list[i]['ID BTS'] || '') === String(id)) return list[i];
  }
  return null;
}

// ============================================================
// MASTER DATA
// ============================================================
function getMasterBTS(e) {
  var rows = getAllBTS();
  var data = rows.map(function(r) {
    return {
      id:                   String(r['Tower ID']                   || r['ID BTS'] || ''),
      towerName:            String(r['Tower Name']                 || ''),
      newTowerOADate:       r['New Tower OA Date (NewTower Activated)']
                              ? r['New Tower OA Date (NewTower Activated)'].toString()
                              : (r['New Tower OA Date'] ? r['New Tower OA Date'].toString() : ''),
      latitude:             parseFloat(r['Lat'] || r['Latitude'])  || 0,
      longitude:            parseFloat(r['Long'] || r['Longitude'])|| 0,
      cluster:              String(r['Cluster']  || r['Cluster XL'] || ''),
      qtySPSeedingByBrands: String(r['Qty SP Seeding per BTS'] || r['Qty SP Seeding by Brand(s)'] || ''),
      spm:                  String(r['PM']       || r['SPM']        || ''),
      spv:                  String(r['SPV']                        || ''),
      kabupaten:            String(r['Kabupaten']                  || ''),
      // legacy / opsional
      kecamatan:            String(r['Kecamatan'] || ''),
      kelurahan:            String(r['Kelurahan'] || ''),
      xl:                   String(r['XL']        || ''),
      region:               String(r['Region']    || ''),
      branch:               String(r['Branch']    || ''),
      statusTower:          String(r['Status Tower'] || ''),
      priority:             String(r['Priority']  || '')
    };
  });
  return jsonResponse({ success: true, data: data });
}

function getMasterPromotor(e) {
  var rows = sheetToObjects(getSheet(SHEET_MASTER_PROMOTOR));
  var data = rows.map(function(r) {
    return {
      namaPromotor: String(r['Nama Promotor Outstore'] || r['Nama Promotor'] || ''),
      spv:          String(r['SPV']           || ''),
      area:         String(r['Area']          || ''),
      status:       String(r['Status']        || 'Active')
    };
  });
  return jsonResponse({ success: true, data: data });
}

function getMasterSPV(e) {
  var rows = sheetToObjects(getSheet(SHEET_MASTER_SPV));
  var data = rows.map(function(r) {
    return {
      namaSPV: String(r['Nama SPV'] || ''),
      area:    String(r['Area']     || '')
    };
  });
  return jsonResponse({ success: true, data: data });
}

// ============================================================
// TRANSACTIONS
// ============================================================
function mapTransaction(r) {
  return {
    id:              String(r['ID']             || ''),
    timestamp:       String(r['Timestamp']      || ''),
    tanggal:         normDate(r['Tanggal']),
    jam:             String(r['Jam']            || ''),
    supervisor:      String(r['Supervisor']     || ''),
    promotor:        String(r['Promotor']       || ''),
    brand:           String(r['Brand']          || ''),
    idBTS:           String(r['ID BTS']         || ''),
    mdn:             String(r['MDN']            || ''),
    photoURL:        String(r['Photo URL']      || ''),
    latitudeUser:    parseFloat(r['Latitude User'])    || 0,
    longitudeUser:   parseFloat(r['Longitude User'])   || 0,
    distanceFromBTS: parseFloat(r['Distance From BTS'])|| 0,
    googleMapsURL:   String(r['Google Maps URL']|| ''),
    device:          String(r['Device']         || ''),
    browser:         String(r['Browser']        || ''),
    status:          String(r['Status']         || 'Success'),
    speedtest:       String(r['Speedtest']      || ''),
    speedtestPhotoURL: String(r['Speedtest Photo URL'] || '')
  };
}

function getTransactions(e) {
  var f = parseFilter(e);
  var rows = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var filtered = applyTransactionFilter(rows, f);
  return jsonResponse({ success: true, data: filtered.map(mapTransaction) });
}

function getBTSHistory(e) {
  var idBTS = (e && e.parameter && e.parameter.idBTS) ? e.parameter.idBTS : '';
  var rows = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var filtered = rows.filter(function(r) { return String(r['ID BTS']) === idBTS; });
  filtered.sort(function(a, b) {
    return String(b['Timestamp']).localeCompare(String(a['Timestamp']));
  });
  return jsonResponse({ success: true, data: filtered.map(mapTransaction) });
}

// ============================================================
// POST TRANSACTION
// ============================================================
function postTransaction(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var sheet = getSheet(SHEET_TRANSACTION);

  var now   = new Date();
  var tz    = Session.getScriptTimeZone();
  var today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var idBTS = String(params.idBTS || '');
  var brand = String(params.brand || '');
  var mdn   = String(params.mdn   || '');

  // Duplicate check: same BTS + Brand + MDN on same day
  var rows = sheetToObjects(sheet);
  var dup = rows.filter(function(r) {
    return String(r['ID BTS']) === idBTS &&
           String(r['Brand'])  === brand &&
           String(r['MDN'])    === mdn &&
           normDate(r['Tanggal']) === today;
  });
  if (dup.length > 0) {
    return jsonResponse({ success: false, error: 'Duplicate: MDN ini sudah digunakan untuk BTS dan Brand yang sama hari ini.' });
  }

  // Upload photo to Drive
  var photoURL = '';
  if (params.photoBase64 && DRIVE_FOLDER_ID !== 'YOUR_DRIVE_FOLDER_ID') {
    try {
      var b64   = params.photoBase64.indexOf(',') > -1
                    ? params.photoBase64.split(',')[1]
                    : params.photoBase64;
      var blob  = Utilities.newBlob(
                    Utilities.base64Decode(b64), 'image/jpeg',
                    'photo_' + idBTS + '_' + now.getTime() + '.jpg');
      var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var file   = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoURL = 'https://drive.google.com/uc?id=' + file.getId();
    } catch (photoErr) {
      // photo upload failed — proceed without photo
      photoURL = '';
    }
  }

  // Upload speedtest photo to Drive
  var speedtestPhotoURL = '';
  if (params.speedtestPhoto && DRIVE_FOLDER_ID !== 'YOUR_DRIVE_FOLDER_ID') {
    try {
      var stB64  = params.speedtestPhoto.indexOf(',') > -1
                     ? params.speedtestPhoto.split(',')[1]
                     : params.speedtestPhoto;
      var stBlob = Utilities.newBlob(
                     Utilities.base64Decode(stB64), 'image/jpeg',
                     'speedtest_' + idBTS + '_' + now.getTime() + '.jpg');
      var stFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var stFile   = stFolder.createFile(stBlob);
      stFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      speedtestPhotoURL = 'https://drive.google.com/uc?id=' + stFile.getId();
    } catch (stErr) {
      speedtestPhotoURL = '';
    }
  }

  var id    = 'TXN-' + now.getTime();
  var tanggal = today;
  var jam     = Utilities.formatDate(now, tz, 'HH:mm:ss');

  // Write header row if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','Timestamp','Tanggal','Jam',
      'Supervisor','Promotor','Brand','ID BTS','MDN','Photo URL',
      'Latitude User','Longitude User','Distance From BTS',
      'Google Maps URL','Device','Browser','Status',
      'Speedtest','Speedtest Photo URL'
    ]);
  }

  sheet.appendRow([
    id, now.toISOString(), tanggal, jam,
    String(params.supervisor  || ''),
    String(params.promotor    || ''),
    brand, idBTS, mdn, photoURL,
    parseFloat(params.latitudeUser)    || 0,
    parseFloat(params.longitudeUser)   || 0,
    parseFloat(params.distanceFromBTS) || 0,
    String(params.googleMapsURL || ''),
    String(params.device  || ''),
    String(params.browser || ''),
    'Success',
    String(params.speedtest || ''),
    speedtestPhotoURL
  ]);

  return jsonResponse({ success: true, id: id, message: 'Transaction saved successfully' });
}

// ============================================================
// DASHBOARD
// ============================================================
function getDashboard(e) {
  var f           = parseFilter(e);
  var txRows      = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var btsRows     = getAllBTS();
  var promotorRows= sheetToObjects(getSheet(SHEET_MASTER_PROMOTOR));
  var spvRows     = sheetToObjects(getSheet(SHEET_MASTER_SPV));

  var now       = new Date();
  var tz        = Session.getScriptTimeZone();
  var today     = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  var weekStartStr  = Utilities.formatDate(weekStart, tz, 'yyyy-MM-dd');
  var monthStart    = Utilities.formatDate(
                        new Date(now.getFullYear(), now.getMonth(), 1), tz, 'yyyy-MM-dd');

  var filtered = applyTransactionFilter(txRows, f);

  var todayAct  = 0, weekAct = 0, monthAct = 0;
  var activatedBTSIds = {}, activePromotors = {}, brandCounts = {};
  filtered.forEach(function(r) {
    var tgl = normDate(r['Tanggal']);
    if (tgl === today)        todayAct++;
    if (tgl >= weekStartStr)  weekAct++;
    if (tgl >= monthStart)    monthAct++;
    activatedBTSIds[r['ID BTS']] = true;
    activePromotors[r['Promotor']] = true;
    var b = String(r['Brand'] || 'Unknown');
    brandCounts[b] = (brandCounts[b] || 0) + 1;
  });

  var activatedBTS = Object.keys(activatedBTSIds).length;
  var totalBTS     = btsRows.length;

  var kabSet = {}, clSet = {}, pmSet = {};
  btsRows.forEach(function(b) {
    var kab = b['Kabupaten'] || '';
    var cl  = b['Cluster']   || b['Cluster XL'] || '';
    var pm  = b['PM']        || b['SPM']         || '';
    if (kab) kabSet[kab] = true;
    if (cl)  clSet[cl]  = true;
    if (pm)  pmSet[pm]  = true;
  });

  var brandDistribution = Object.keys(brandCounts).map(function(k) {
    return { brand: k, count: brandCounts[k] };
  });
  var activePromCount = Object.keys(activePromotors).length;

  return jsonResponse({ success: true, data: {
    todayActivation:        todayAct,
    weeklyActivation:       weekAct,
    monthlyActivation:      monthAct,
    totalBTS:               totalBTS,
    activatedBTS:           activatedBTS,
    pendingBTS:             totalBTS - activatedBTS,
    activationPercent:      totalBTS > 0 ? (activatedBTS / totalBTS) * 100 : 0,
    totalPromotor:          promotorRows.length,
    activePromotor:         activePromCount,
    totalSPV:               spvRows.length,
    totalKabupaten:         Object.keys(kabSet).length,
    totalCluster:           Object.keys(clSet).length,
    totalPM:                Object.keys(pmSet).length,
    brandDistribution:      brandDistribution,
    avgActivationPerBTS:    activatedBTS > 0 ? filtered.length / activatedBTS : 0,
    avgActivationPerPromotor: activePromCount > 0 ? filtered.length / activePromCount : 0,
    avgActivationPerSPV:    spvRows.length > 0 ? filtered.length / spvRows.length : 0
  }});
}

// ============================================================
// ANALYTICS
// ============================================================
function getAnalytics(e) {
  var f        = parseFilter(e);
  var txRows   = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var filtered = applyTransactionFilter(txRows, f);
  var tz       = Session.getScriptTimeZone();

  // Daily trend
  var dailyCounts = {};
  filtered.forEach(function(r) {
    var d = normDate(r['Tanggal']);
    if (d) dailyCounts[d] = (dailyCounts[d] || 0) + 1;
  });
  // No slice limit — return all dates in the filtered range so the chart
  // matches exactly what the user selected. Client can paginate/scroll if needed.
  var dailyTrend = Object.keys(dailyCounts).sort()
    .map(function(d) { return { date: d, count: dailyCounts[d] }; });

  // Weekly trend
  var weeklyCounts = {};
  filtered.forEach(function(r) {
    if (!r['Tanggal']) return;
    var d = (r['Tanggal'] instanceof Date) ? r['Tanggal'] : new Date(normDate(r['Tanggal']));
    if (isNaN(d.getTime())) return;
    var w = Utilities.formatDate(d, tz, 'yyyy-ww');
    weeklyCounts[w] = (weeklyCounts[w] || 0) + 1;
  });
  var weeklyTrend = Object.keys(weeklyCounts).sort()
    .map(function(w) { return { week: w, count: weeklyCounts[w] }; });

  // Monthly trend
  var monthlyCounts = {};
  filtered.forEach(function(r) {
    var d = normDate(r['Tanggal']).substring(0, 7);
    if (d) monthlyCounts[d] = (monthlyCounts[d] || 0) + 1;
  });
  var monthlyTrend = Object.keys(monthlyCounts).sort()
    .map(function(m) { return { month: m, count: monthlyCounts[m] }; });

  // Generic counter → sorted performance list
  function toList(obj) {
    var t = 0;
    Object.keys(obj).forEach(function(k) { t += obj[k]; });
    return Object.keys(obj).map(function(k) {
      return { name: k, count: obj[k], percent: t > 0 ? (obj[k] / t) * 100 : 0 };
    }).sort(function(a, b) { return b.count - a.count; });
  }

  var brandC = {}, spvC = {}, promC = {}, kabC = {}, clC = {}, pmC = {}, btsC = {};
  var hourC  = {}; for (var h = 0; h < 24; h++) hourC[h] = 0;
  var wdC    = [0,0,0,0,0,0,0];

  filtered.forEach(function(r) {
    var b = String(r['Brand']      || 'Unknown'); brandC[b] = (brandC[b] || 0) + 1;
    var s = String(r['Supervisor'] || 'Unknown'); spvC[s]   = (spvC[s]   || 0) + 1;
    var p = String(r['Promotor']   || 'Unknown'); promC[p]  = (promC[p]  || 0) + 1;
    var id= String(r['ID BTS']     || 'Unknown'); btsC[id]  = (btsC[id]  || 0) + 1;

    var bts = getBTSById(r['ID BTS']);
    if (bts) {
      var k = String(bts['Kabupaten'] || 'Unknown'); kabC[k] = (kabC[k] || 0) + 1;
      var c = String(bts['Cluster']   || bts['Cluster XL'] || 'Unknown'); clC[c] = (clC[c] || 0) + 1;
      var m = String(bts['PM']        || bts['SPM']        || 'Unknown'); pmC[m] = (pmC[m] || 0) + 1;
    }

    var jam  = String(r['Jam'] || '00:00:00');
    var hour = parseInt(jam.substring(0, 2)) || 0;
    hourC[hour]++;

    if (r['Tanggal']) {
      var dt = (r['Tanggal'] instanceof Date) ? r['Tanggal'] : new Date(normDate(r['Tanggal']));
      if (!isNaN(dt.getTime())) wdC[dt.getDay()]++;
    }
  });

  // Moving average (3-day window)
  var movingAverage = dailyTrend.map(function(d, i, arr) {
    var s = Math.max(0, i - 2), e2 = Math.min(arr.length - 1, i + 2), sum = 0;
    for (var j = s; j <= e2; j++) sum += arr[j].count;
    return { date: d.date, count: Math.round(sum / (e2 - s + 1)) };
  });

  // Growth % (compare 2nd half vs 1st half)
  var half   = Math.floor(filtered.length / 2);
  var older  = half;
  var recent = filtered.length - half;
  var growthPercent = older > 0 ? ((recent - older) / older) * 100 : 0;

  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return jsonResponse({ success: true, data: {
    dailyTrend:            dailyTrend,
    weeklyTrend:           weeklyTrend,
    monthlyTrend:          monthlyTrend,
    brandDistribution:     Object.keys(brandC).map(function(k) { return { brand: k, count: brandC[k] }; }),
    supervisorPerformance: toList(spvC),
    promotorPerformance:   toList(promC),
    kabupatenPerformance:  toList(kabC),
    clusterPerformance:    toList(clC),
    pmPerformance:         toList(pmC),
    hourlyActivation:      Object.keys(hourC).map(function(h) { return { hour: parseInt(h), count: hourC[h] }; }),
    weekdayActivation:     DAYS.map(function(day, i) { return { day: day, count: wdC[i] }; }),
    top10Promotor:         toList(promC).slice(0, 10),
    top10BTS:              toList(btsC).slice(0, 10),
    topKabupaten:          toList(kabC).slice(0, 10),
    topCluster:            toList(clC).slice(0, 10),
    topPM:                 toList(pmC).slice(0, 10),
    brandShare:            Object.keys(brandC).map(function(k) { return { brand: k, count: brandC[k] }; }),
    growthPercent:         growthPercent,
    movingAverage:         movingAverage
  }});
}

// ============================================================
// GALLERY
// ============================================================
function getGallery(e) {
  var f        = parseFilter(e);
  var txRows   = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var filtered = applyTransactionFilter(txRows, f).filter(function(r) {
    return r['Photo URL'] && String(r['Photo URL']).length > 0;
  });
  filtered.sort(function(a, b) {
    return String(b['Timestamp']).localeCompare(String(a['Timestamp']));
  });
  var data = filtered.map(function(r) {
    var bts = getBTSById(r['ID BTS']) || {};
    return {
      id:           String(r['ID']          || ''),
      timestamp:    String(r['Timestamp']   || ''),
      tanggal:      normDate(r['Tanggal']),
      promotor:     String(r['Promotor']    || ''),
      supervisor:   String(r['Supervisor']  || ''),
      brand:        String(r['Brand']       || ''),
      idBTS:        String(r['ID BTS']      || ''),
      towerName:    String(bts['Tower Name']|| ''),
      kabupaten:    String(bts['Kabupaten'] || ''),
      cluster:      String(bts['Cluster']   || bts['Cluster XL'] || ''),
      pm:           String(bts['PM']        || bts['SPM']        || ''),
      photoURL:     String(r['Photo URL']   || ''),
      latitudeUser: parseFloat(r['Latitude User'])  || 0,
      longitudeUser:parseFloat(r['Longitude User']) || 0,
      googleMapsURL:String(r['Google Maps URL']|| '')
    };
  });
  return jsonResponse({ success: true, data: data });
}

// ============================================================
// MAP DATA
// ============================================================
function getMapData(e) {
  var txRows  = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var btsRows = getAllBTS();
  var tz      = Session.getScriptTimeZone();
  var now     = new Date();
  var today   = Utilities.formatDate(now, tz, 'yyyy-MM-dd');

  var weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  var weekStartStr = Utilities.formatDate(weekStart, tz, 'yyyy-MM-dd');
  var monthStart   = Utilities.formatDate(
                       new Date(now.getFullYear(), now.getMonth(), 1), tz, 'yyyy-MM-dd');

  // Group transactions by BTS
  var btsActs = {};
  txRows.forEach(function(r) {
    var id = String(r['ID BTS'] || '');
    if (!btsActs[id]) btsActs[id] = [];
    btsActs[id].push(r);
  });

  var markers = btsRows.map(function(bts) {
    var id   = String(bts['Tower ID'] || bts['ID BTS'] || '');
    var acts = btsActs[id] || [];
    acts.sort(function(a, b) {
      return normDate(b['Tanggal']).localeCompare(normDate(a['Tanggal']));
    });
    var last = acts[0] || null;
    var markerStatus = 'never';
    if (last) {
      var d = normDate(last['Tanggal']);
      if      (d === today)        markerStatus = 'today';
      else if (d >= weekStartStr)  markerStatus = 'week';
      else if (d >= monthStart)    markerStatus = 'month';
      else                         markerStatus = 'month';
    }
    if (String(bts['Status Tower']) === 'Problem') markerStatus = 'problem';

    return {
      id:              id,
      towerName:       String(bts['Tower Name'] || ''),
      latitude:        parseFloat(bts['Lat']  || bts['Latitude'])  || 0,
      longitude:       parseFloat(bts['Long'] || bts['Longitude']) || 0,
      kabupaten:       String(bts['Kabupaten']  || ''),
      cluster:         String(bts['Cluster']    || bts['Cluster XL'] || ''),
      pm:              String(bts['PM']         || bts['SPM']        || ''),
      spv:             String(bts['SPV']         || ''),
      markerStatus:    markerStatus,
      activationCount: acts.length,
      lastActivation:  last ? (normDate(last['Tanggal']) + ' ' + String(last['Jam'] || '')) : null,
      lastPromotor:    last ? String(last['Promotor'] || '') : null,
      lastPhotoURL:    last ? String(last['Photo URL']|| '') : null
    };
  });

  return jsonResponse({ success: true, data: { markers: markers } });
}

// ============================================================
// IMPORT MASTER DATA
// ============================================================
// IMPORT MASTER DATA  (batch-optimised — uses setValues, not appendRow per row)
// ============================================================
function importMasterData(e) {
  var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
  var payload;
  try { payload = JSON.parse(raw); }
  catch (err) { return jsonResponse({ success: false, error: 'Invalid JSON: ' + err.toString() }); }

  var target = payload.target || '';
  var rows   = payload.rows   || [];
  var mode   = payload.mode   || 'append';

  if (!rows.length) return jsonResponse({ success: false, error: 'Tidak ada data.' });

  // ── Schema per target ──────────────────────────────────────────────────
  var sheetName, keyCol, requiredCols, headerRow;

  if (target === 'bts') {
    sheetName    = SHEET_MASTER_BTS;
    keyCol       = 'Tower ID';
    requiredCols = ['Tower ID', 'Lat', 'Long', 'Kabupaten'];
    headerRow    = ['Tower ID','Tower Name','New Tower OA Date (NewTower Activated)',
                    'Lat','Long','Cluster','Qty SP Seeding per BTS','PM','SPV','Kabupaten'];

  } else if (target === 'promotor') {
    sheetName    = SHEET_MASTER_PROMOTOR;
    keyCol       = 'Nama Promotor Outstore';
    requiredCols = ['Nama Promotor Outstore'];
    headerRow    = ['Nama Promotor Outstore','SPV','Area','Status'];

  } else if (target === 'spv') {
    sheetName    = SHEET_MASTER_SPV;
    keyCol       = 'Nama SPV';
    requiredCols = ['Nama SPV'];
    headerRow    = ['Nama SPV','Area'];

  } else {
    return jsonResponse({ success: false, error: 'Target tidak valid: ' + target });
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  var inserted = 0, updated = 0, skipped = 0, errors = [];

  // ── Validate rows first ────────────────────────────────────────────────
  var validRows = [];
  rows.forEach(function(row, idx) {
    var missing = requiredCols.filter(function(c) {
      return !row[c] || String(row[c]).trim() === '';
    });
    if (missing.length > 0) {
      skipped++;
      if (errors.length < 5) errors.push('Baris ' + (idx + 2) + ': ' + missing.join(', ') + ' kosong');
    } else {
      validRows.push(row);
    }
  });

  if (validRows.length === 0) {
    return jsonResponse({ success: false, inserted: 0, updated: 0, skipped: skipped,
      errors: errors, error: 'Tidak ada baris valid untuk diimpor.' });
  }

  // ── REPLACE mode: clear + bulk write ──────────────────────────────────
  if (mode === 'replace') {
    sheet.clearContents();
    var writeData = [headerRow].concat(validRows.map(function(row) {
      return headerRow.map(function(h) { return row[h] !== undefined ? String(row[h]) : ''; });
    }));
    sheet.getRange(1, 1, writeData.length, headerRow.length).setValues(writeData);
    inserted = validRows.length;
    _btsCache = null;
    return jsonResponse({ success: true, inserted: inserted, updated: 0, skipped: skipped,
      errors: errors, message: 'Replace selesai: ' + inserted + ' baris ditulis.' });
  }

  // ── APPEND / UPSERT mode ──────────────────────────────────────────────
  // Read existing data once
  var existingData = sheet.getDataRange().getValues();
  var existingKeys = {};  // keyValue → sheetRowNumber (1-based)
  var headers, keyIndex = -1;

  if (existingData.length > 0) {
    headers  = existingData[0].map(function(h) { return h ? h.toString().trim() : ''; });
    keyIndex = headers.indexOf(keyCol);
    if (keyIndex >= 0) {
      for (var r = 1; r < existingData.length; r++) {
        var k = String(existingData[r][keyIndex] || '').trim();
        if (k) existingKeys[k] = r + 1;
      }
    }
  } else {
    // Empty sheet — write header first
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    keyIndex = headerRow.indexOf(keyCol);
  }

  // Separate into: rows to update (existing key) vs rows to append (new key)
  var toUpdate = [];  // { sheetRow, values }
  var toAppend = [];  // values[]

  validRows.forEach(function(row) {
    var keyVal = String(row[keyCol] || '').trim();
    var newRow = headerRow.map(function(h) { return row[h] !== undefined ? String(row[h]) : ''; });
    if (existingKeys[keyVal]) {
      toUpdate.push({ sheetRow: existingKeys[keyVal], values: newRow });
    } else {
      toAppend.push(newRow);
      // Reserve the next row number for duplicate detection within batch
      existingKeys[keyVal] = (sheet.getLastRow() || existingData.length) + toAppend.length;
    }
  });

  // Bulk update (each row individually, but no sheet reads in loop)
  toUpdate.forEach(function(item) {
    sheet.getRange(item.sheetRow, 1, 1, headerRow.length).setValues([item.values]);
    updated++;
  });

  // Bulk append all new rows at once
  if (toAppend.length > 0) {
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, toAppend.length, headerRow.length).setValues(toAppend);
    inserted = toAppend.length;
  }

  _btsCache = null;
  return jsonResponse({
    success: true,
    inserted: inserted,
    updated:  updated,
    skipped:  skipped,
    errors:   errors,
    message:  inserted + ' baris ditambah, ' + updated + ' diperbarui, ' + skipped + ' dilewati.'
  });
}
