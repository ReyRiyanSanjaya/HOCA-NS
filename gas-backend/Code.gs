/**
 * AXIS Seeding Dashboard - Google Apps Script Backend
 * Deploy as Web App: Execute as Me, Access: Anyone
 */

// ============================================================
// CONFIGURATION - Update these with your Google Sheet IDs
// ============================================================
var SPREADSHEET_ID = 'YOUR_GOOGLE_SPREADSHEET_ID';
var SHEET_MASTER_BTS = 'MASTER_BTS';
var SHEET_MASTER_PROMOTOR = 'MASTER_PROMOTOR';
var SHEET_MASTER_SPV = 'MASTER_SPV';
var SHEET_TRANSACTION = 'TRANSACTION';
var DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID'; // For photo uploads

// ============================================================
// CORS HEADERS
// ============================================================
function setCORSHeaders(output) {
  return output
    .addHeader('Access-Control-Allow-Origin', '*')
    .addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .addHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ============================================================
// MAIN HANDLER
// ============================================================
function doGet(e) {
  var action = e.parameter.action || '';
  var output;
  try {
    switch (action) {
      case 'master-bts':
        output = getMasterBTS(e);
        break;
      case 'master-promotor':
        output = getMasterPromotor(e);
        break;
      case 'master-spv':
        output = getMasterSPV(e);
        break;
      case 'dashboard':
        output = getDashboard(e);
        break;
      case 'analytics':
        output = getAnalytics(e);
        break;
      case 'gallery':
        output = getGallery(e);
        break;
      case 'transactions':
        output = getTransactions(e);
        break;
      case 'map':
        output = getMapData(e);
        break;
      case 'bts-history':
        output = getBTSHistory(e);
        break;
      default:
        output = jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    output = jsonResponse({ success: false, error: err.toString() });
  }
  return setCORSHeaders(output);
}

function doPost(e) {
  var output;
  try {
    var params = e.parameter || {};
    var action = params.action || 'transaction';
    if (action === 'transaction') {
      output = postTransaction(e);
    } else {
      output = jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    output = jsonResponse({ success: false, error: err.toString() });
  }
  return setCORSHeaders(output);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function parseFilter(e) {
  return {
    dateFrom: e.parameter.dateFrom || '',
    dateTo: e.parameter.dateTo || '',
    supervisor: e.parameter.supervisor || '',
    promotor: e.parameter.promotor || '',
    brand: e.parameter.brand || '',
    kabupaten: e.parameter.kabupaten || '',
    cluster: e.parameter.cluster || '',
    pm: e.parameter.pm || '',
    statusTower: e.parameter.statusTower || '',
    keyword: e.parameter.keyword || ''
  };
}

function applyTransactionFilter(rows, f) {
  return rows.filter(function(r) {
    if (f.dateFrom && r['Tanggal'] < f.dateFrom) return false;
    if (f.dateTo && r['Tanggal'] > f.dateTo) return false;
    if (f.supervisor && r['Supervisor'] !== f.supervisor) return false;
    if (f.promotor && r['Promotor'] !== f.promotor) return false;
    if (f.brand && r['Brand'] !== f.brand) return false;
    if (f.kabupaten) {
      var bts = getBTSById(r['ID BTS']);
      if (!bts || bts['Kabupaten'] !== f.kabupaten) return false;
    }
    if (f.keyword) {
      var kw = f.keyword.toLowerCase();
      var searchStr = JSON.stringify(r).toLowerCase();
      if (!searchStr.includes(kw)) return false;
    }
    return true;
  });
}

var _btsCache = null;
function getAllBTS() {
  if (!_btsCache) {
    _btsCache = sheetToObjects(getSheet(SHEET_MASTER_BTS));
  }
  return _btsCache;
}

function getBTSById(id) {
  return getAllBTS().filter(function(b) { return b['ID BTS'] === id; })[0] || null;
}

// ============================================================
// MASTER DATA ENDPOINTS
// ============================================================
function getMasterBTS(e) {
  var rows = getAllBTS();
  var data = rows.map(function(r) {
    return {
      id: r['ID BTS'] || '',
      towerName: r['Tower Name'] || '',
      latitude: parseFloat(r['Latitude']) || 0,
      longitude: parseFloat(r['Longitude']) || 0,
      kabupaten: r['Kabupaten'] || '',
      kecamatan: r['Kecamatan'] || '',
      kelurahan: r['Kelurahan'] || '',
      cluster: r['Cluster XL'] || '',
      xl: r['XL'] || '',
      spm: r['SPM'] || '',
      spv: r['SPV'] || '',
      region: r['Region'] || '',
      branch: r['Branch'] || '',
      newTowerOADate: r['New Tower OA Date'] ? r['New Tower OA Date'].toString() : '',
      qtySPSeedingByBrands: r['Qty SP Seeding by Brand(s)'] || '',
      statusTower: r['Status Tower'] || '',
      priority: r['Priority'] || ''
    };
  });
  return jsonResponse({ success: true, data: data });
}

function getMasterPromotor(e) {
  var rows = sheetToObjects(getSheet(SHEET_MASTER_PROMOTOR));
  var data = rows.map(function(r) {
    return {
      namaPromotor: r['Nama Promotor'] || '',
      spv: r['SPV'] || '',
      area: r['Area'] || '',
      status: r['Status'] || 'Active'
    };
  });
  return jsonResponse({ success: true, data: data });
}

function getMasterSPV(e) {
  var rows = sheetToObjects(getSheet(SHEET_MASTER_SPV));
  var data = rows.map(function(r) {
    return {
      namaSPV: r['Nama SPV'] || '',
      area: r['Area'] || ''
    };
  });
  return jsonResponse({ success: true, data: data });
}

// ============================================================
// TRANSACTIONS
// ============================================================
function getTransactions(e) {
  var f = parseFilter(e);
  var rows = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var filtered = applyTransactionFilter(rows, f);
  var data = filtered.map(function(r) {
    return mapTransaction(r);
  });
  return jsonResponse({ success: true, data: data });
}

function mapTransaction(r) {
  return {
    id: r['ID'] || r['id'] || '',
    timestamp: r['Timestamp'] || '',
    tanggal: r['Tanggal'] || '',
    jam: r['Jam'] || '',
    supervisor: r['Supervisor'] || '',
    promotor: r['Promotor'] || '',
    brand: r['Brand'] || '',
    idBTS: r['ID BTS'] || '',
    mdn: r['MDN'] || '',
    photoURL: r['Photo URL'] || '',
    latitudeUser: parseFloat(r['Latitude User']) || 0,
    longitudeUser: parseFloat(r['Longitude User']) || 0,
    distanceFromBTS: parseFloat(r['Distance From BTS']) || 0,
    googleMapsURL: r['Google Maps URL'] || '',
    device: r['Device'] || '',
    browser: r['Browser'] || '',
    status: r['Status'] || 'Success'
  };
}

function getBTSHistory(e) {
  var idBTS = e.parameter.idBTS || '';
  var rows = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var filtered = rows.filter(function(r) { return r['ID BTS'] === idBTS; });
  filtered.sort(function(a, b) {
    return (b['Timestamp'] || '').toString().localeCompare((a['Timestamp'] || '').toString());
  });
  var data = filtered.map(function(r) { return mapTransaction(r); });
  return jsonResponse({ success: true, data: data });
}

// ============================================================
// POST TRANSACTION
// ============================================================
function postTransaction(e) {
  var params = e.parameter || {};
  var sheet = getSheet(SHEET_TRANSACTION);
  if (!sheet) throw new Error('TRANSACTION sheet not found');

  var now = new Date();
  var idBTS = params.idBTS || '';

  // Check for MDN duplicate on same BTS + Brand + Day
  var rows = sheetToObjects(sheet);
  var today = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var dup = rows.filter(function(r) {
    return r['ID BTS'] === idBTS &&
      r['Brand'] === params.brand &&
      r['MDN'] === params.mdn &&
      (r['Tanggal'] || '').toString().substring(0, 10) === today;
  });
  if (dup.length > 0) {
    return jsonResponse({ success: false, error: 'Duplicate MDN for this BTS and Brand today' });
  }

  // Upload photo to Drive
  var photoURL = '';
  if (params.photoBase64 && DRIVE_FOLDER_ID !== 'YOUR_DRIVE_FOLDER_ID') {
    try {
      var base64Data = params.photoBase64.split(',')[1] || params.photoBase64;
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg',
        'photo_' + idBTS + '_' + now.getTime() + '.jpg');
      var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoURL = 'https://drive.google.com/uc?id=' + file.getId();
    } catch (photoErr) {
      photoURL = '';
    }
  }

  var id = 'TXN-' + now.getTime();
  var tanggal = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var jam = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');

  var row = [
    id, now.toISOString(), tanggal, jam,
    params.supervisor || '', params.promotor || '', params.brand || '',
    idBTS, params.mdn || '', photoURL,
    parseFloat(params.latitudeUser) || 0, parseFloat(params.longitudeUser) || 0,
    parseFloat(params.distanceFromBTS) || 0, params.googleMapsURL || '',
    params.device || '', params.browser || '', 'Success'
  ];

  // Ensure headers exist
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(['ID','Timestamp','Tanggal','Jam','Supervisor','Promotor','Brand',
      'ID BTS','MDN','Photo URL','Latitude User','Longitude User','Distance From BTS',
      'Google Maps URL','Device','Browser','Status']);
  }

  sheet.appendRow(row);
  return jsonResponse({ success: true, id: id, message: 'Transaction saved successfully' });
}

// ============================================================
// DASHBOARD
// ============================================================
function getDashboard(e) {
  var f = parseFilter(e);
  var txRows = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var btsRows = getAllBTS();
  var promotorRows = sheetToObjects(getSheet(SHEET_MASTER_PROMOTOR));
  var spvRows = sheetToObjects(getSheet(SHEET_MASTER_SPV));

  var now = new Date();
  var tz = Session.getScriptTimeZone();
  var today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1);
  var weekStartStr = Utilities.formatDate(weekStart, tz, 'yyyy-MM-dd');
  var monthStart = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth(), 1), tz, 'yyyy-MM-dd');

  var filtered = applyTransactionFilter(txRows, f);

  var todayAct = filtered.filter(function(r) { return r['Tanggal'] === today; }).length;
  var weekAct = filtered.filter(function(r) { return r['Tanggal'] >= weekStartStr; }).length;
  var monthAct = filtered.filter(function(r) { return r['Tanggal'] >= monthStart; }).length;

  var activatedBTSIds = {};
  filtered.forEach(function(r) { activatedBTSIds[r['ID BTS']] = true; });
  var activatedBTS = Object.keys(activatedBTSIds).length;
  var totalBTS = btsRows.length;

  var activePromotors = {};
  filtered.forEach(function(r) { activePromotors[r['Promotor']] = true; });

  var brandCounts = {};
  filtered.forEach(function(r) {
    var b = r['Brand'] || 'Unknown';
    brandCounts[b] = (brandCounts[b] || 0) + 1;
  });
  var brandDistribution = Object.keys(brandCounts).map(function(k) {
    return { brand: k, count: brandCounts[k] };
  });

  var kabupatenSet = {};
  var clusterSet = {};
  var pmSet = {};
  btsRows.forEach(function(b) {
    if (b['Kabupaten']) kabupatenSet[b['Kabupaten']] = true;
    if (b['Cluster XL']) clusterSet[b['Cluster XL']] = true;
    if (b['SPM']) pmSet[b['SPM']] = true;
  });

  var data = {
    todayActivation: todayAct,
    weeklyActivation: weekAct,
    monthlyActivation: monthAct,
    totalBTS: totalBTS,
    activatedBTS: activatedBTS,
    pendingBTS: totalBTS - activatedBTS,
    activationPercent: totalBTS > 0 ? (activatedBTS / totalBTS) * 100 : 0,
    totalPromotor: promotorRows.length,
    activePromotor: Object.keys(activePromotors).length,
    totalSPV: spvRows.length,
    totalKabupaten: Object.keys(kabupatenSet).length,
    totalCluster: Object.keys(clusterSet).length,
    totalPM: Object.keys(pmSet).length,
    brandDistribution: brandDistribution,
    avgActivationPerBTS: activatedBTS > 0 ? filtered.length / activatedBTS : 0,
    avgActivationPerPromotor: Object.keys(activePromotors).length > 0 ?
      filtered.length / Object.keys(activePromotors).length : 0,
    avgActivationPerSPV: spvRows.length > 0 ? filtered.length / spvRows.length : 0
  };

  return jsonResponse({ success: true, data: data });
}

// ============================================================
// ANALYTICS
// ============================================================
function getAnalytics(e) {
  var f = parseFilter(e);
  var txRows = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var filtered = applyTransactionFilter(txRows, f);
  var btsRows = getAllBTS();

  // Daily trend (last 30 days)
  var dailyCounts = {};
  filtered.forEach(function(r) {
    var d = (r['Tanggal'] || '').toString().substring(0, 10);
    if (d) dailyCounts[d] = (dailyCounts[d] || 0) + 1;
  });
  var dailyTrend = Object.keys(dailyCounts).sort().map(function(d) {
    return { date: d, count: dailyCounts[d] };
  }).slice(-30);

  // Weekly trend
  var weeklyCounts = {};
  filtered.forEach(function(r) {
    var d = r['Tanggal'] ? new Date(r['Tanggal']) : null;
    if (!d) return;
    var week = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-ww');
    weeklyCounts[week] = (weeklyCounts[week] || 0) + 1;
  });
  var weeklyTrend = Object.keys(weeklyCounts).sort().map(function(w) {
    return { week: w, count: weeklyCounts[w] };
  });

  // Monthly trend
  var monthlyCounts = {};
  filtered.forEach(function(r) {
    var d = r['Tanggal'] ? (r['Tanggal'].toString()).substring(0, 7) : '';
    if (d) monthlyCounts[d] = (monthlyCounts[d] || 0) + 1;
  });
  var monthlyTrend = Object.keys(monthlyCounts).sort().map(function(m) {
    return { month: m, count: monthlyCounts[m] };
  });

  // Brand distribution
  var brandCounts = {};
  filtered.forEach(function(r) {
    var b = r['Brand'] || 'Unknown';
    brandCounts[b] = (brandCounts[b] || 0) + 1;
  });
  var total = filtered.length;

  // Supervisor performance
  var spvCounts = {};
  filtered.forEach(function(r) {
    var s = r['Supervisor'] || 'Unknown';
    spvCounts[s] = (spvCounts[s] || 0) + 1;
  });

  // Promotor performance
  var promCounts = {};
  filtered.forEach(function(r) {
    var p = r['Promotor'] || 'Unknown';
    promCounts[p] = (promCounts[p] || 0) + 1;
  });

  // Kabupaten performance
  var kabCounts = {};
  filtered.forEach(function(r) {
    var bts = getBTSById(r['ID BTS']);
    if (bts) {
      var k = bts['Kabupaten'] || 'Unknown';
      kabCounts[k] = (kabCounts[k] || 0) + 1;
    }
  });

  // Cluster performance
  var clCounts = {};
  filtered.forEach(function(r) {
    var bts = getBTSById(r['ID BTS']);
    if (bts) {
      var c = bts['Cluster XL'] || 'Unknown';
      clCounts[c] = (clCounts[c] || 0) + 1;
    }
  });

  // PM performance
  var pmCounts = {};
  filtered.forEach(function(r) {
    var bts = getBTSById(r['ID BTS']);
    if (bts) {
      var p = bts['SPM'] || 'Unknown';
      pmCounts[p] = (pmCounts[p] || 0) + 1;
    }
  });

  function toPerformanceList(obj) {
    var t = Object.values(obj).reduce(function(s, v) { return s + v; }, 0);
    return Object.keys(obj).map(function(k) {
      return { name: k, count: obj[k], percent: t > 0 ? (obj[k] / t) * 100 : 0 };
    }).sort(function(a, b) { return b.count - a.count; });
  }

  // Hourly
  var hourlyCounts = {};
  for (var h = 0; h < 24; h++) hourlyCounts[h] = 0;
  filtered.forEach(function(r) {
    var jam = r['Jam'] || '';
    var hour = parseInt(jam.toString().substring(0, 2)) || 0;
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
  });
  var hourlyActivation = Object.keys(hourlyCounts).map(function(h) {
    return { hour: parseInt(h), count: hourlyCounts[h] };
  });

  // Weekday
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var wdCounts = [0,0,0,0,0,0,0];
  filtered.forEach(function(r) {
    var d = r['Tanggal'] ? new Date(r['Tanggal']) : null;
    if (d) wdCounts[d.getDay()]++;
  });
  var weekdayActivation = DAYS.map(function(day, i) {
    return { day: day, count: wdCounts[i] };
  });

  // Moving average (7-day)
  var movingAverage = dailyTrend.map(function(d, i, arr) {
    var start = Math.max(0, i - 3);
    var end = Math.min(arr.length - 1, i + 3);
    var sum = 0;
    for (var j = start; j <= end; j++) sum += arr[j].count;
    return { date: d.date, count: Math.round(sum / (end - start + 1)) };
  });

  // Growth
  var half = Math.floor(filtered.length / 2);
  var recent = filtered.slice(half).length;
  var older = filtered.slice(0, half).length;
  var growthPercent = older > 0 ? ((recent - older) / older) * 100 : 0;

  var brandList = Object.keys(brandCounts).map(function(k) {
    return { brand: k, count: brandCounts[k] };
  });

  var spvPerf = toPerformanceList(spvCounts);
  var promPerf = toPerformanceList(promCounts);
  var kabPerf = toPerformanceList(kabCounts);
  var clPerf = toPerformanceList(clCounts);
  var pmPerf = toPerformanceList(pmCounts);

  var data = {
    dailyTrend: dailyTrend,
    weeklyTrend: weeklyTrend,
    monthlyTrend: monthlyTrend,
    brandDistribution: brandList,
    supervisorPerformance: spvPerf,
    promotorPerformance: promPerf,
    kabupatenPerformance: kabPerf,
    clusterPerformance: clPerf,
    pmPerformance: pmPerf,
    hourlyActivation: hourlyActivation,
    weekdayActivation: weekdayActivation,
    top10Promotor: promPerf.slice(0, 10),
    top10BTS: (function() {
      var btsCounts = {};
      filtered.forEach(function(r) {
        var id = r['ID BTS'] || 'Unknown';
        btsCounts[id] = (btsCounts[id] || 0) + 1;
      });
      return toPerformanceList(btsCounts).slice(0, 10);
    })(),
    topKabupaten: kabPerf.slice(0, 10),
    topCluster: clPerf.slice(0, 10),
    topPM: pmPerf.slice(0, 10),
    brandShare: brandList,
    growthPercent: growthPercent,
    movingAverage: movingAverage
  };

  return jsonResponse({ success: true, data: data });
}

// ============================================================
// GALLERY
// ============================================================
function getGallery(e) {
  var f = parseFilter(e);
  var txRows = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var filtered = applyTransactionFilter(txRows, f).filter(function(r) { return r['Photo URL']; });
  filtered.sort(function(a, b) {
    return (b['Timestamp'] || '').toString().localeCompare((a['Timestamp'] || '').toString());
  });
  var data = filtered.map(function(r) {
    var bts = getBTSById(r['ID BTS']) || {};
    return {
      id: r['ID'] || '',
      timestamp: r['Timestamp'] || '',
      tanggal: r['Tanggal'] || '',
      promotor: r['Promotor'] || '',
      supervisor: r['Supervisor'] || '',
      brand: r['Brand'] || '',
      idBTS: r['ID BTS'] || '',
      towerName: bts['Tower Name'] || '',
      kabupaten: bts['Kabupaten'] || '',
      cluster: bts['Cluster XL'] || '',
      pm: bts['SPM'] || '',
      photoURL: r['Photo URL'] || '',
      latitudeUser: parseFloat(r['Latitude User']) || 0,
      longitudeUser: parseFloat(r['Longitude User']) || 0,
      googleMapsURL: r['Google Maps URL'] || ''
    };
  });
  return jsonResponse({ success: true, data: data });
}

// ============================================================
// MAP DATA
// ============================================================
function getMapData(e) {
  var f = parseFilter(e);
  var txRows = sheetToObjects(getSheet(SHEET_TRANSACTION));
  var btsRows = getAllBTS();
  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1);
  var weekStartStr = Utilities.formatDate(weekStart, tz, 'yyyy-MM-dd');
  var monthStart = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth(), 1), tz, 'yyyy-MM-dd');

  // Build activation map
  var btsActivations = {};
  txRows.forEach(function(r) {
    var id = r['ID BTS'];
    if (!btsActivations[id]) btsActivations[id] = [];
    btsActivations[id].push(r);
  });

  var markers = btsRows.map(function(bts) {
    var id = bts['ID BTS'];
    var acts = btsActivations[id] || [];
    acts.sort(function(a, b) {
      return (b['Tanggal'] || '').toString().localeCompare((a['Tanggal'] || '').toString());
    });
    var last = acts[0] || null;
    var markerStatus = 'never';
    if (last) {
      var d = (last['Tanggal'] || '').toString().substring(0, 10);
      if (d === today) markerStatus = 'today';
      else if (d >= weekStartStr) markerStatus = 'week';
      else if (d >= monthStart) markerStatus = 'month';
      else markerStatus = 'month';
    }
    if (bts['Status Tower'] === 'Problem') markerStatus = 'problem';

    return {
      id: id,
      towerName: bts['Tower Name'] || '',
      latitude: parseFloat(bts['Latitude']) || 0,
      longitude: parseFloat(bts['Longitude']) || 0,
      kabupaten: bts['Kabupaten'] || '',
      cluster: bts['Cluster XL'] || '',
      pm: bts['SPM'] || '',
      spv: bts['SPV'] || '',
      markerStatus: markerStatus,
      activationCount: acts.length,
      lastActivation: last ? (last['Tanggal'] + ' ' + last['Jam']) : null,
      lastPromotor: last ? last['Promotor'] : null,
      lastPhotoURL: last ? last['Photo URL'] : null
    };
  });

  return jsonResponse({ success: true, data: { markers: markers } });
}
