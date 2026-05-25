# Backend Changes — Persist Change Indicator Across Sessions

> [!IMPORTANT]
> Your backend is hosted on Render at `https://render-backend-5sur.onrender.com`.
> These changes must be applied to **that** backend repo and redeployed.

---

## What the Frontend Now Sends

When a user edits and saves a Customer Login Form record, the frontend now sends two **new fields** in the PATCH request body:

```json
{
  "...all existing fields...",
  "lastChanges": {
    "remark":  { "oldVal": "old text", "newVal": "new text" },
    "status":  { "oldVal": "Login",    "newVal": "Sanction" }
  },
  "lastChangedAt": "2026-03-19T12:30:00.000Z"
}
```

When a user **dismisses** the indicator on a card, the frontend sends:

```json
{
  "lastChanges": null,
  "lastChangedAt": null
}
```

The frontend reads `app.lastChanges` and `app.lastChangedAt` from the GET `/api/applications` response to render the indicator.

---

## Step 1 — Update the Mongoose Schema

Find your [Application](file:///c:/Users/harsh/MIS-Intigration2-main/src/components/cust-login-form.jsx#253-270) model file (typically `models/Application.js` or similar).

Add these two fields to the schema:

```js
// Inside your existing Schema definition, add these two fields:

lastChanges: {
  type: mongoose.Schema.Types.Mixed,  // stores any object/map
  default: null,
},
lastChangedAt: {
  type: Date,
  default: null,
},
```

### Full example of the model block (add alongside your existing fields):

```js
const ApplicationSchema = new mongoose.Schema({
  // ... all your existing fields (name, mobile, bank, etc.) ...

  // ✅ NEW: Change tracking
  lastChanges: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  lastChangedAt: {
    type: Date,
    default: null,
  },
});
```

> [!TIP]
> `mongoose.Schema.Types.Mixed` allows storing any arbitrary object — perfect for
> the diff map `{ fieldName: { oldVal, newVal } }`.

---

## Step 2 — Allow the Fields in Your PATCH Route

Find your PATCH route for applications. It probably looks like:

```js
router.patch("/api/applications/:id", async (req, res) => {
  const updates = req.body;
  const app = await Application.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json(app);
});
```

**If your PATCH route uses a whitelist** (explicit field list), you need to add the two new fields. Look for something like this and add the highlighted lines:

```js
router.patch("/api/applications/:id", async (req, res) => {
  try {
    const allowed = {
      // ... your existing allowed fields ...
      name: req.body.name,
      status: req.body.status,
      // ... etc ...

      // ✅ ADD THESE TWO LINES:
      lastChanges: req.body.lastChanges !== undefined ? req.body.lastChanges : undefined,
      lastChangedAt: req.body.lastChangedAt !== undefined ? req.body.lastChangedAt : undefined,
    };

    // Remove undefined keys so they don't overwrite existing data
    Object.keys(allowed).forEach(key => allowed[key] === undefined && delete allowed[key]);

    const app = await Application.findByIdAndUpdate(req.params.id, allowed, { new: true });
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

> [!NOTE]
> If your PATCH route uses `req.body` directly (no whitelist), you **don't need to change the route at all** — MongoDB will simply store the new fields alongside existing ones, since Mongoose `Mixed` type accepts anything.

---

## Step 3 — Handle `null` for Dismiss

When the user dismisses the indicator, the frontend sends `lastChanges: null`. Mongoose will correctly store `null` to the field — no special handling needed.  
Just make sure your route does **not** strip out `null` values before saving.

If you have something like `Object.keys(body).forEach(k => !body[k] && delete body[k])`, **remove that guard** or add exceptions for `lastChanges` and `lastChangedAt`, otherwise the dismiss won't work.

---

## Step 4 — Verify the GET Route Returns the New Fields

Your GET `/api/applications` route most likely returns all fields automatically. Double-check it's not using `.select()` with an exclusion list that would omit new fields:

```js
// ✅ This is fine — returns everything:
const apps = await Application.find({});

// ⚠️ If you have something like this, you need to add the new fields:
const apps = await Application.find({}).select('name mobile bank status ...');
// → add: .select('name mobile bank status ... lastChanges lastChangedAt')
```

---

## Step 5 — Redeploy on Render

1. Commit and push the backend changes to your Git repo
2. Render will auto-deploy (or trigger manually from the Render dashboard)
3. No database migration needed — MongoDB adds new fields to documents on first write

---

## Summary of All Changes

| File | Change |
|------|--------|
| `models/Application.js` | Add `lastChanges: Mixed` and `lastChangedAt: Date` fields |
| `routes/applications.js` | Ensure PATCH allows `lastChanges` + `lastChangedAt` through (only if you have a whitelist) |
| `routes/applications.js` | Ensure GET returns `lastChanges` + `lastChangedAt` (only if you use `.select()`) |

> [!NOTE]
> **No frontend deployment needed** — the frontend changes are already live in your local dev server, and once you push and deploy frontend to Vercel, it will automatically work with the updated backend.

---

## Testing Checklist

- [ ] Edit a card → save → **yellow bar appears on the card** with "N fields changed"
- [ ] Refresh the page → **bar is still there** (persisted in DB)
- [ ] Click **👁 View Changes** → modal opens with old/new values
- [ ] Click **✕** → bar disappears and stays gone after refresh (null saved to DB)
