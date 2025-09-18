/**
 * Google Apps Script for Registration System
 * Handles both frontend serving and backend API for registration data
 */

// Configuration
const SHEET_NAME = 'pendaftaran';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

/**
 * Handle GET requests - serve the frontend HTML
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle POST requests - process registration data
 */
function doPost(e) {
  try {
    // Handle preflight OPTIONS request
    if (e.parameter.method === 'OPTIONS') {
      return createResponse({ success: true });
    }

    // Parse request data
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createResponse({ 
        success: false, 
        error: 'Invalid JSON data' 
      }, 400);
    }

    // Validate required fields (excluding auto-generated ones)
    const requiredFields = ['nama', 'email', 'telepon', 'alamat'];
    const missingFields = requiredFields.filter(field => !data[field] || data[field].trim() === '');
    
    if (missingFields.length > 0) {
      return createResponse({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, 400);
    }

    // Save to spreadsheet
    const result = saveToSheet(data);
    
    if (result.success) {
      return createResponse({ 
        success: true, 
        message: 'Registration successful!',
        id: result.id,
        timestamp: result.timestamp
      });
    } else {
      return createResponse({ 
        success: false, 
        error: result.error 
      }, 500);
    }

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createResponse({ 
      success: false, 
      error: 'Internal server error' 
    }, 500);
  }
}

/**
 * Save registration data to spreadsheet
 */
function saveToSheet(data) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // Set up headers
      const headers = ['ID', 'Tanggal Daftar', 'Nama', 'Email', 'Telepon', 'Alamat'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }

    // Generate auto ID and timestamp
    const lastRow = sheet.getLastRow();
    const newId = lastRow > 0 ? lastRow : 1; // Simple incremental ID
    const timestamp = new Date();

    // Prepare data row
    const rowData = [
      newId,
      timestamp,
      data.nama,
      data.email,
      data.telepon,
      data.alamat
    ];

    // Add additional fields if they exist (adaptive to column changes)
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const extendedRowData = [];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().replace(/\s+/g, '');
      
      if (header === 'id') {
        extendedRowData.push(newId);
      } else if (header === 'tanggaldaftar' || header === 'timestamp') {
        extendedRowData.push(timestamp);
      } else if (header === 'nama' && data.nama) {
        extendedRowData.push(data.nama);
      } else if (header === 'email' && data.email) {
        extendedRowData.push(data.email);
      } else if (header === 'telepon' && data.telepon) {
        extendedRowData.push(data.telepon);
      } else if (header === 'alamat' && data.alamat) {
        extendedRowData.push(data.alamat);
      } else if (data[headers[i]] !== undefined) {
        extendedRowData.push(data[headers[i]]);
      } else {
        extendedRowData.push('');
      }
    }

    // Insert the new row
    sheet.getRange(lastRow + 1, 1, 1, extendedRowData.length).setValues([extendedRowData]);

    return {
      success: true,
      id: newId,
      timestamp: timestamp
    };

  } catch (error) {
    Logger.log('Error saving to sheet: ' + error.toString());
    return {
      success: false,
      error: 'Failed to save data: ' + error.toString()
    };
  }
}

/**
 * Create HTTP response with proper CORS headers
 */
function createResponse(data, statusCode = 200) {
  const response = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Add CORS headers
  Object.keys(CORS_HEADERS).forEach(header => {
    response.setHeader(header, CORS_HEADERS[header]);
  });

  return response;
}

/**
 * Include external files (for HTML template)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}