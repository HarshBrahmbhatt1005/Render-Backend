# Dynamic Floor Height Fields Implementation

## Overview
This document describes the implementation of dynamic floor height validation and storage for Builder Visit forms based on property type (Development Type).

## Requirements Implemented

### 1. Validation Logic

The system now validates floor height fields dynamically based on the selected Development Type:

#### Residential Properties
- **Required Field**: `clearFloorHeight`
- **Other Fields**: `clearFloorHeightRetail`, `clearFloorHeightFlats`, `clearFloorHeightOffices` (stored as empty strings if not provided)

#### Resi+Commercial Properties
- **Required Fields**: `clearFloorHeightRetail`, `clearFloorHeightFlats`
- **Other Fields**: `clearFloorHeight`, `clearFloorHeightOffices` (stored as empty strings if not provided)

#### Commercial Properties
- **Required Fields**: `clearFloorHeightRetail`, `clearFloorHeightOffices`
- **Other Fields**: `clearFloorHeight`, `clearFloorHeightFlats` (stored as empty strings if not provided)

### 2. Database Schema Changes

Added four new fields to the `BuilderVisitData` schema:

```javascript
clearFloorHeight: { type: String, default: "" }
clearFloorHeightRetail: { type: String, default: "" }
clearFloorHeightFlats: { type: String, default: "" }
clearFloorHeightOffices: { type: String, default: "" }
```

**Key Features**:
- All fields stored in database regardless of property type
- Default value is empty string ("")
- Backward compatible with existing records
- No data loss for old records

### 3. API Endpoints Updated

#### POST `/api/builder-visits`
- Validates floor height fields based on `developmentType`
- Returns 400 error if required fields are missing
- Stores all four fields in database (empty or with values)

#### PATCH `/api/builder-visits/:id`
- Same validation logic as POST
- Validates floor height fields on update
- Maintains data integrity

### 4. Excel Export Changes

Both export endpoints now include all four floor height columns:

#### Export Columns Added:
- Clear Floor Height
- Retail Floor Height
- Flats Floor Height
- Offices Floor Height

**Display Logic**:
- Shows actual value from database (empty string if not provided)
- All columns always present in export
- Maintains frozen header row
- Preserves column order

## Files Modified

1. **`models/BuilderVisitData.js`**
   - Added 4 new floor height fields to schema (default: "")

2. **`Routes/BuilderVisits.js`**
   - Added validation logic in POST endpoint
   - Added validation logic in PATCH endpoint
   - Updated Excel export to include floor height columns

3. **`exportBuilderVisits.js`**
   - Added floor height columns to export configuration
   - All fields exported as-is from database

## Validation Error Messages

The system returns clear error messages:

- Residential: `"Clear Floor Height is required for Residential properties"`
- Resi+Commercial: 
  - `"Retail Floor Height is required for Resi+Commercial properties"`
  - `"Flats Floor Height is required for Resi+Commercial properties"`
- Commercial:
  - `"Retail Floor Height is required for Commercial properties"`
  - `"Offices Floor Height is required for Commercial properties"`

## Backward Compatibility

- Existing records without floor height data remain valid
- No migration script needed
- Old records display empty values in exports
- No breaking changes to existing functionality

## Testing Recommendations

1. **Create New Records**:
   - Test Residential property with clearFloorHeight
   - Test Resi+Commercial with retail and flats heights
   - Test Commercial with retail and offices heights

2. **Validation Testing**:
   - Try submitting without required fields (should fail)
   - Submit with all fields populated (should succeed)

3. **Export Testing**:
   - Export records of different property types
   - Verify all four columns present
   - Verify values stored correctly

4. **Update Testing**:
   - Update existing records
   - Change property type and verify validation

## Expected Behavior

1. User selects Development Type
2. Frontend shows relevant floor height fields
3. User fills required fields and submits
4. Backend validates based on property type
5. Database stores all four fields (empty or with values)
6. Excel export shows all four columns with stored values
7. Empty fields show as blank cells in Excel

## Notes

- All four fields always stored in database
- Frontend controls which fields are visible/required
- Backend validates only required fields based on property type
- Excel exports include all four columns regardless of property type
- No "N/A" values - empty fields remain empty
