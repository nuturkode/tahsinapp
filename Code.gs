// Google Apps Script backend for registration form
// This script handles form submissions and stores data to Google Sheets

/**
 * Main function to handle HTTP requests
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = submitForm(data);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Error processing request: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get form fields based on the sheet headers
 */
function getFormFields() {
  try {
    const sheet = getOrCreateSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Filter out empty headers and create field definitions
    const fields = headers
      .map((header, index) => ({
        name: header,
        type: getFieldType(header),
        required: isRequiredField(header),
        readonly: isReadonlyField(header),
        columnIndex: index + 1
      }))
      .filter(field => field.name && field.name.trim() !== '');
    
    return {
      success: true,
      fields: fields
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error getting form fields: ' + error.toString()
    };
  }
}

/**
 * Submit form data to the sheet
 */
function submitForm(formData) {
  try {
    const sheet = getOrCreateSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Prepare row data
    const rowData = [];
    headers.forEach((header, index) => {
      if (header === 'id') {
        // Auto-increment ID
        rowData[index] = getNextId(sheet);
      } else if (header === 'tgl_daftar') {
        // Auto-fill current date and time
        rowData[index] = new Date();
      } else {
        // Use submitted data or empty string
        rowData[index] = formData[header] || '';
      }
    });
    
    // Add the row to the sheet
    sheet.appendRow(rowData);
    
    return {
      success: true,
      message: 'Form submitted successfully!',
      id: rowData[headers.indexOf('id')]
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error submitting form: ' + error.toString()
    };
  }
}

/**
 * Get or create the pendaftaran sheet
 */
function getOrCreateSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('pendaftaran');
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet('pendaftaran');
    // Initialize with default headers if sheet is new
    initializeSheet(sheet);
  }
  
  return sheet;
}

/**
 * Initialize sheet with default headers
 */
function initializeSheet(sheet) {
  const defaultHeaders = [
    'id',
    'tgl_daftar', 
    'nama_lengkap',
    'email',
    'nomor_telepon',
    'alamat',
    'tanggal_lahir',
    'jenis_kelamin'
  ];
  
  sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, defaultHeaders.length);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
}

/**
 * Get next auto-increment ID
 */
function getNextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return 1; // First entry
  }
  
  // Get the last ID and increment
  const idColumn = getColumnIndexByHeader(sheet, 'id');
  if (idColumn === -1) {
    return 1;
  }
  
  const lastId = sheet.getRange(lastRow, idColumn).getValue();
  return (parseInt(lastId) || 0) + 1;
}

/**
 * Get column index by header name
 */
function getColumnIndexByHeader(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(headerName) + 1; // 1-based index
}

/**
 * Determine field type based on header name
 */
function getFieldType(header) {
  const lowerHeader = header.toLowerCase();
  
  if (lowerHeader.includes('email')) return 'email';
  if (lowerHeader.includes('telepon') || lowerHeader.includes('phone')) return 'tel';
  if (lowerHeader.includes('tanggal') || lowerHeader.includes('date')) return 'date';
  if (lowerHeader.includes('password')) return 'password';
  if (lowerHeader.includes('alamat') || lowerHeader.includes('address')) return 'textarea';
  if (lowerHeader.includes('jenis_kelamin') || lowerHeader.includes('gender')) return 'select';
  
  return 'text';
}

/**
 * Determine if field is required
 */
function isRequiredField(header) {
  const requiredFields = ['nama_lengkap', 'email', 'nomor_telepon'];
  return requiredFields.includes(header.toLowerCase()) || 
         header.toLowerCase().includes('nama') || 
         header.toLowerCase().includes('email');
}

/**
 * Determine if field is readonly
 */
function isReadonlyField(header) {
  const readonlyFields = ['id', 'tgl_daftar'];
  return readonlyFields.includes(header.toLowerCase());
}

/**
 * Get select options for specific fields
 */
function getSelectOptions(fieldName) {
  const lowerField = fieldName.toLowerCase();
  
  if (lowerField.includes('jenis_kelamin') || lowerField.includes('gender')) {
    return ['Laki-laki', 'Perempuan'];
  }
  
  return [];
}