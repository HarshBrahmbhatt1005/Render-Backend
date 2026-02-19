**Approval Workflow and API**

- **Model**: `approval` object added to `BuilderVisit` with `level1` and `level2`:
  - `status`: "Pending" | "Approved" | "Rejected"
  - `by`: approver identifier (string)
  - `at`: Date
  - `comment`: optional string

- **Backward compatibility**: legacy `approvalStatus` preserved; migration script maps old values into `approval`.

- **Endpoints**:
  - PATCH `/api/builder-visits/:id/approve`
    - Body: `{ password, level: 1|2, comment? }`
    - Verifies password via env vars `APPROVE_LEVEL1_PASSWORD` / `APPROVE_LEVEL2_PASSWORD` (quick option)
    - Rules: cannot L2-approve before L1 is `Approved`
    - On success: sets `approval.levelN` to `Approved`, `by`, `at`, `comment`. If both approved, sets legacy `approvalStatus` = "Approved".

  - PATCH `/api/builder-visits/:id/reject`
    - Body: `{ password, level: 1|2, comment? }`
    - Sets `approval.levelN` to `Rejected`, updates `approvalStatus` to `Changes Needed`.

  - PATCH `/api/builder-visits/:id` (edit)
    - When resources are edited by users, both approval levels are reset to Pending.

- **Migration**: Run `node scripts/migrateApprovalStatus.js` with `MONGO_URI` set.

Example approve request:

PATCH /api/builder-visits/634b.../approve
Body: `{ "password":"secret1", "level":1, "comment":"Checked docs" }`

Response: updated resource JSON including full `approval` object.
