# Backend Implementation - Executives Field Only

## Overview
This guide covers ONLY the implementation of the **Executives** field (name and number array).

---

## 1. Database Schema Update

Add this field to your `BuilderVisit` Mongoose schema:

```javascript
const builderVisitSchema = new mongoose.Schema({
  // ... all your existing fields ...
  
  // ✅ ADD THIS NEW FIELD
  executives: [{
    name: {
      type: String,
      trim: true
    },
    number: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^\d{10}$/.test(v);
        },
        message: 'Executive number must be 10 digits'
      }
    }
  }],
  
  // ... rest of your existing fields ...
});
```

---

## 2. API Routes - No Changes Needed!

The executives field will automatically be saved when you create or update a visit. The frontend sends it in the request body as:

```json
{
  "executives": [
    {
      "name": "Rajesh Kumar",
      "number": "9876543210"
    },
    {
      "name": "Priya Sharma",
      "number": "9876543211"
    }
  ]
}
```

Your existing POST and PATCH routes will handle it automatically if you're using:
```javascript
const newVisit = new BuilderVisit(req.body);
```

---

## 3. Excel Export Update

### Step 1: Add Column Header

In your Excel export route, add the "Executives" column:

```javascript
worksheet.columns = [
  // ... your existing columns ...
  { header: "Contact Number", key: "officePersonNumber", width: 15 },
  { header: "Executives", key: "executives", width: 40 }, // ✅ ADD THIS
  { header: "Gentry", key: "gentry", width: 20 },
  // ... rest of your columns ...
];
```

### Step 2: Format Executives Data

Add this helper function before your data rows:

```javascript
// ✅ ADD THIS FUNCTION
const formatExecutives = (executives) => {
  if (!executives || executives.length === 0) return "";
  return executives
    .map(exec => `${exec.name} - ${exec.number}`)
    .join('; ');
};
```

### Step 3: Add to Data Rows

When adding data rows, include the executives field:

```javascript
visits.forEach((visit) => {
  worksheet.addRow({
    // ... your existing fields ...
    officePersonNumber: visit.officePersonNumber || "",
    executives: formatExecutives(visit.executives), // ✅ ADD THIS
    gentry: visit.gentry || "",
    // ... rest of your fields ...
  });
});
```

---

## 4. Complete Excel Export Example

Here's the complete section you need to update:

```javascript
router.get("/export/excel", async (req, res) => {
  // ... password validation ...
  
  try {
    const visits = await BuilderVisit.find({
      "approval.level2.status": "Approved"
    }).sort({ "approval.level2.at": -1 });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Level 2 Approved Properties");
    
    // Define columns
    worksheet.columns = [
      { header: "Project Name", key: "projectName", width: 25 },
      { header: "Builder Name", key: "builderName", width: 25 },
      { header: "Group Name", key: "groupName", width: 25 },
      { header: "Location", key: "location", width: 35 },
      { header: "Development Type", key: "developmentType", width: 25 },
      { header: "Contact Person", key: "officePersonDetails", width: 30 },
      { header: "Contact Number", key: "officePersonNumber", width: 15 },
      { header: "Executives", key: "executives", width: 40 }, // ✅ NEW
      { header: "Gentry", key: "gentry", width: 20 },
      // ... rest of your columns ...
    ];
    
    // ✅ ADD THIS HELPER FUNCTION
    const formatExecutives = (executives) => {
      if (!executives || executives.length === 0) return "";
      return executives
        .map(exec => `${exec.name} - ${exec.number}`)
        .join('; ');
    };
    
    // Add data rows
    visits.forEach((visit) => {
      worksheet.addRow({
        projectName: visit.projectName || "",
        builderName: visit.builderName || "",
        groupName: visit.groupName || "",
        location: visit.location || "",
        developmentType: visit.developmentType || "",
        officePersonDetails: visit.officePersonDetails || "",
        officePersonNumber: visit.officePersonNumber || "",
        executives: formatExecutives(visit.executives), // ✅ NEW
        gentry: visit.gentry || "",
        // ... rest of your fields ...
      });
    });
    
    // ... rest of your Excel export code ...
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ error: "Failed to generate Excel file" });
  }
});
```

---

## 5. Example Data

### Frontend Sends:
```json
{
  "builderName": "ABC Builders",
  "projectName": "Sunrise Apartments",
  "executives": [
    {
      "name": "Rajesh Kumar",
      "number": "9876543210"
    },
    {
      "name": "Priya Sharma",
      "number": "9876543211"
    }
  ]
}
```

### Database Stores:
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "builderName": "ABC Builders",
  "projectName": "Sunrise Apartments",
  "executives": [
    {
      "name": "Rajesh Kumar",
      "number": "9876543210",
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2"
    },
    {
      "name": "Priya Sharma",
      "number": "9876543211",
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3"
    }
  ]
}
```

### Excel Shows:
```
Executives Column: "Rajesh Kumar - 9876543210; Priya Sharma - 9876543211"
```

---

## 6. Testing

Test these scenarios:

1. ✅ Create visit with NO executives (empty array)
2. ✅ Create visit with ONE executive
3. ✅ Create visit with MULTIPLE executives
4. ✅ Update visit and add/remove executives
5. ✅ Export to Excel and verify executives column shows correctly

---

## 7. Migration (If Needed)

If you have existing data without the executives field, run this:

```javascript
// Add to your migration script
const visits = await BuilderVisit.find({});

for (const visit of visits) {
  if (!visit.executives) {
    visit.executives = [];
    await visit.save();
  }
}

console.log("✅ Migration complete");
```

---

## Summary

**What to do:**
1. Add `executives` array field to your Mongoose schema
2. Add "Executives" column to Excel export
3. Add `formatExecutives()` helper function
4. Include executives in the worksheet.addRow() call

**That's it!** The field will automatically save and retrieve with your existing API routes.
