# Level 2 Approval Logic - Implementation Guide

## Backend Changes Summary

### 1. Database Status Updates

When approvals happen, the `approvalStatus` field is updated as follows:

- **Level 1 Approved**: `approvalStatus = "Level1Approved"`
- **Level 2 Approved**: `approvalStatus = "Level2Approved"` (both Level 1 & 2 approved)
- **Level 1 Rejected**: `approvalStatus = "Level1Rejected"`
- **Level 2 Rejected**: `approvalStatus = "Level2Rejected"`

### 2. API Endpoints Updated

#### GET `/api/builder-visits`
- **Purpose**: Fetch active/pending builder cards for main dashboard
- **Filter**: Excludes Level 2 Approved properties
- **Query**: 
  ```javascript
  {
    $or: [
      { "approval.level2.status": { $ne: "Approved" } },
      { "approval.level2.status": { $exists: false } }
    ]
  }
  ```
- **Result**: Only shows cards that need approval or are in progress

#### GET `/api/builder-visits/approved` (NEW)
- **Purpose**: Fetch Level 2 approved properties (for archive/history view)
- **Filter**: Only Level 2 Approved properties
- **Query**: `{ "approval.level2.status": "Approved" }`
- **Sort**: By Level 2 approval date (most recent first)

#### GET `/api/builder-visits/export/excel`
- **Purpose**: Export to Excel
- **Filter**: ONLY Level 2 Approved properties
- **Query**: `{ "approval.level2.status": "Approved" }`
- **Result**: Excel contains only fully approved properties

### 3. Approval Flow

```
┌─────────────────┐
│  Card Created   │
│  (Pending)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Level 1 Approve │
│ Status: Level1  │
│ Approved        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Level 2 Approve │
│ Status: Level2  │
│ Approved        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Card Hidden     │
│ from Dashboard  │
│ (Auto-removed)  │
└─────────────────┘
```

## Frontend Implementation Guide

### 1. Main Dashboard - Active Cards

**Endpoint**: `GET /api/builder-visits`

```javascript
// Fetch active cards (automatically filtered by backend)
const fetchActiveCards = async () => {
  const response = await fetch('/api/builder-visits');
  const cards = await response.json();
  // These cards will NOT include Level 2 approved ones
  setActiveCards(cards);
};
```

### 2. Archive/History View (Optional)

**Endpoint**: `GET /api/builder-visits/approved`

```javascript
// Fetch Level 2 approved cards for history
const fetchApprovedCards = async () => {
  const response = await fetch('/api/builder-visits/approved');
  const approvedCards = await response.json();
  setArchivedCards(approvedCards);
};
```

### 3. Real-time UI Update After Approval

```javascript
// After Level 2 approval success
const handleLevel2Approval = async (cardId, password, comment) => {
  const response = await fetch(`/api/builder-visits/${cardId}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      password, 
      level: 2, 
      comment 
    })
  });

  if (response.ok) {
    const updatedCard = await response.json();
    
    // Check if Level 2 is now approved
    if (updatedCard.approval?.level2?.status === "Approved") {
      // Remove card from active list immediately
      setActiveCards(prev => prev.filter(card => card._id !== cardId));
      
      // Show success message
      toast.success("Level 2 Approved! Card moved to archive.");
    }
  }
};
```

### 4. Status Display Logic

```javascript
const getStatusBadge = (card) => {
  const level1Status = card.approval?.level1?.status;
  const level2Status = card.approval?.level2?.status;

  if (level2Status === "Approved") {
    return <Badge color="green">Level 2 Approved</Badge>;
  }
  
  if (level2Status === "Rejected") {
    return <Badge color="red">Level 2 Rejected</Badge>;
  }
  
  if (level1Status === "Approved") {
    return <Badge color="blue">Awaiting Level 2</Badge>;
  }
  
  if (level1Status === "Rejected") {
    return <Badge color="red">Level 1 Rejected</Badge>;
  }
  
  return <Badge color="yellow">Pending Level 1</Badge>;
};
```

### 5. Excel Export

```javascript
const exportToExcel = async (password) => {
  const response = await fetch(
    `/api/builder-visits/export/excel?password=${password}`
  );
  
  if (response.ok) {
    // Download Excel file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'builder-visits-approved.xlsx';
    a.click();
  } else if (response.status === 404) {
    toast.error("No Level 2 approved properties found");
  }
};
```

## Key Benefits

✅ **Automatic Removal**: Level 2 approved cards automatically disappear from main dashboard
✅ **No Manual Refresh**: Backend filtering ensures clean data
✅ **Excel Accuracy**: Only fully approved properties in export
✅ **No Duplication**: Clear separation between active and archived cards
✅ **Instant UI Update**: Frontend can immediately remove card after Level 2 approval

## Testing Checklist

- [ ] Create a new builder card
- [ ] Approve at Level 1 - card should still be visible
- [ ] Approve at Level 2 - card should disappear from main dashboard
- [ ] Check `/api/builder-visits/approved` - card should appear here
- [ ] Export Excel - only Level 2 approved cards should be included
- [ ] Reject at Level 1 - card should remain visible with rejected status
- [ ] Reject at Level 2 - card should remain visible with rejected status
