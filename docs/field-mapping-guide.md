# Field Mapping Guide - Builder Visit Data

## Backend Field Names (Use these exact names in frontend)

### Builder Visit Level Fields

```javascript
{
  // Builder Information
  "builderName": "ABC Builders",           // ✅ Builder company name
  "builderNumber": "+91-9876543210",       // ✅ Builder contact number
  "groupName": "ABC Group",                // ✅ Group name
  "projectName": "Sunrise Apartments",     // ✅ Project name
  "location": "Mumbai",                    // ✅ Location
  
  // Developer Office Person
  "officePersonDetails": "John Doe",       // ✅ Developer office person name
  "officePersonNumber": "+91-9876543211", // ✅ Developer office person number
  
  // Other Fields
  "dateOfVisit": "2024-01-15",
  "gentry": "Premium",
  "businessType": "Residential",
  "stageOfConstruction": "Under Construction",
  "developmentType": "Apartment",
  "totalUnitsBlocks": "200",
  "expectedCompletionDate": "2025-12-31",
  "negotiable": "Yes",
  "financingRequirements": "Bank Loan Available",
  "residentType": "Family",
  "nearbyProjects": "XYZ Mall, ABC School",
  "surroundingCommunity": "Developed",
  "enquiryType": "Direct",
  "unitsForSale": "50",
  "timeLimitMonths": 12,
  "remark": "Good project",
  "payout": "5%",
  "approvalStatus": "Pending"
}
```

### Property Level Fields (Inside propertySizes array)

```javascript
{
  "propertySizes": [
    {
      // Basic Details
      "size": "2 BHK",                    // ✅ Property size
      "floor": "5th",                     // ✅ Floor number
      "sqft": "1200",                     // ✅ Square feet
      "sqyd": "133",                      // ✅ Square yards
      "category": "Premium",              // ✅ Property category
      
      // Pricing
      "basicRate": "5000",                // ✅ Basic rate per sqft
      "aecAuda": "50000",                 // ✅ AEC/AUDA charges
      "selldedAmount": "6000000",         // ✅ Sellded amount
      "boxPrice": "6500000",              // ✅ Box price
      "downPayment": "500000",            // ✅ Down payment
      
      // Additional Charges
      "plc": "50000",                     // ✅ Preferential Location Charges
      "frc": "30000",                     // ✅ Floor Rise Charges
      "maintenance": "2500",              // ✅ Monthly maintenance
      "maintenanceDeposit": "100000"      // ✅ Maintenance deposit
    }
  ]
}
```

## Common Issues & Solutions

### Issue 1: Fields not saving
**Problem**: Data sent from frontend but not stored in database

**Solution**: 
1. Check field names match exactly (case-sensitive)
2. Check Render logs for debug output
3. Verify frontend is sending data in request body

### Issue 2: Developer number not showing
**Problem**: `officePersonNumber` not displaying

**Checklist**:
- [ ] Frontend sends field as `officePersonNumber` (not `developerNumber` or `developerNum`)
- [ ] Field is included in the request body
- [ ] Check Render logs for the debug output showing received data
- [ ] Verify the field is returned in GET response

### Issue 3: Property fields not saving
**Problem**: Fields like `plc`, `frc`, `sqyd` not stored

**Solution**:
- These fields MUST be inside each property object in the `propertySizes` array
- NOT at the builder visit level

**Wrong**:
```javascript
{
  builderName: "ABC",
  plc: "50000",  // ❌ Wrong location
  propertySizes: [...]
}
```

**Correct**:
```javascript
{
  builderName: "ABC",
  propertySizes: [
    {
      size: "2 BHK",
      plc: "50000"  // ✅ Correct location
    }
  ]
}
```

## Testing Steps

### 1. Create a new builder visit
```bash
POST /api/builder-visits
Content-Type: application/json

{
  "builderName": "Test Builder",
  "builderNumber": "+91-1234567890",
  "officePersonDetails": "Test Person",
  "officePersonNumber": "+91-0987654321",
  "propertySizes": [
    {
      "size": "2 BHK",
      "sqft": "1200",
      "sqyd": "133",
      "basicRate": "5000",
      "plc": "50000",
      "frc": "30000",
      "maintenanceDeposit": "100000"
    }
  ]
}
```

### 2. Check Render Logs
Look for:
```
=== BUILDER VISIT CREATE DEBUG ===
builderNumber: +91-1234567890
officePersonNumber: +91-0987654321
propertySizes: [...]
==================================
```

### 3. Verify in GET response
```bash
GET /api/builder-visits
```

Check that the response includes all fields.

## Frontend Example (React)

```javascript
const handleSubmit = async (formData) => {
  const payload = {
    // Builder level fields
    builderName: formData.builderName,
    builderNumber: formData.builderNumber,  // ✅ Correct field name
    officePersonDetails: formData.officePersonDetails,
    officePersonNumber: formData.officePersonNumber,  // ✅ Correct field name
    
    // Property array
    propertySizes: formData.properties.map(prop => ({
      size: prop.size,
      sqft: prop.sqft,
      sqyd: prop.sqyd,              // ✅ Inside property object
      basicRate: prop.basicRate,    // ✅ Inside property object
      plc: prop.plc,                // ✅ Inside property object
      frc: prop.frc,                // ✅ Inside property object
      maintenanceDeposit: prop.maintenanceDeposit  // ✅ Inside property object
    }))
  };

  const response = await fetch('/api/builder-visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log('Saved:', result);
};
```

## Debugging Checklist

If fields are not saving:

1. **Check Render Logs**
   - Go to Render Dashboard → Your Service → Logs
   - Look for the debug output showing received data
   - Verify the field names and values

2. **Check Frontend Network Tab**
   - Open browser DevTools → Network
   - Find the POST/PATCH request
   - Check the Request Payload
   - Verify field names match exactly

3. **Check Database Response**
   - After POST, check the response body
   - Verify all fields are present in the returned object
   - If missing, the field name is wrong or not sent

4. **Common Field Name Mistakes**
   - `developerNumber` ❌ → `officePersonNumber` ✅
   - `builderPhone` ❌ → `builderNumber` ✅
   - `squareYards` ❌ → `sqyd` ✅
   - `basicPrice` ❌ → `basicRate` ✅
