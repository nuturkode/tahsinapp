# Registration System - Google Apps Script Deployment Guide

## Overview
This registration system consists of:
- **Backend**: Google Apps Script (`Code.gs`) that handles data storage and API endpoints
- **Frontend**: Vue 3 + Tailwind CSS interface (`index.html`) for user registration

## Features
✅ **Auto-generated ID** - Each registration gets a unique incremental ID  
✅ **Auto timestamp** - Registration date/time is automatically recorded  
✅ **CORS handling** - Proper cross-origin request support  
✅ **Adaptive columns** - Automatically adapts to spreadsheet column changes  
✅ **Form validation** - Client-side and server-side validation  
✅ **Responsive design** - Works on mobile and desktop  
✅ **Error handling** - User-friendly error messages  

## Deployment Instructions

### Step 1: Create Google Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Replace the default `Code.gs` content with the code from `Code.gs` file
4. Create a new HTML file called `index` and paste the content from `index.html`

### Step 2: Connect to Google Sheets
1. Create a new Google Sheets document
2. The script will automatically create a "pendaftaran" sheet with proper headers when first used
3. No manual setup required - the system is fully adaptive

### Step 3: Deploy as Web App
1. In Google Apps Script, click "Deploy" → "New deployment"
2. Choose type: "Web app"
3. Set execute as: "Me"
4. Set access: "Anyone" (for public registration)
5. Click "Deploy" and copy the web app URL

### Step 4: Test the System
1. Open the deployed web app URL
2. Fill out the registration form
3. Check the Google Sheets to verify data is saved correctly

## Data Structure

The system creates a spreadsheet with these columns:
- **ID** - Auto-generated unique identifier
- **Tanggal Daftar** - Auto-generated timestamp
- **Nama** - Full name (user input)
- **Email** - Email address (user input)
- **Telepon** - Phone number (user input)
- **Alamat** - Full address (user input)

## API Endpoints

### GET Request
- **Purpose**: Serves the frontend HTML interface
- **URL**: `{deployment-url}/exec`
- **Response**: HTML page with registration form

### POST Request
- **Purpose**: Process registration data
- **URL**: `{deployment-url}/exec`
- **Content-Type**: `application/json`
- **Body**: 
```json
{
  "nama": "John Doe",
  "email": "john@example.com",
  "telepon": "08123456789",
  "alamat": "Jl. Example No. 123, Jakarta"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Registration successful!",
  "id": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```
- **Error Response**:
```json
{
  "success": false,
  "error": "Missing required fields: nama, email"
}
```

## Security Features
- Input validation and sanitization
- CORS headers for cross-origin requests
- Error handling to prevent data leaks
- Required field validation

## Customization

### Adding New Fields
1. Update the `requiredFields` array in `Code.gs` if the field is mandatory
2. Add the new input field to `index.html` form
3. Update the form validation in the Vue.js component
4. The spreadsheet will automatically adapt to new columns

### Styling Changes
- Modify Tailwind CSS classes in `index.html`
- Update the Vue.js component styling as needed
- All styles are contained within the HTML file

### Business Logic Changes
- Modify the `saveToSheet()` function in `Code.gs`
- Update validation rules in both frontend and backend
- Add additional processing logic as needed

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure the web app is deployed with "Anyone" access
2. **Permission Errors**: Check if the script has access to Google Sheets
3. **Data Not Saving**: Verify the sheet name matches `SHEET_NAME` constant
4. **Form Not Loading**: Check if both `Code.gs` and `index.html` are properly set up

### Logging
- Check Google Apps Script logs for server-side errors
- Use browser console for client-side debugging
- Error messages are logged with timestamps for troubleshooting

## Maintenance
- Monitor the Google Sheets for successful registrations
- Check Google Apps Script execution logs periodically
- Update the system as needed for new requirements