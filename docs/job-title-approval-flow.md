## Decision Maker Job Title Approval Flow

Some Decision Maker roles require validation to maintain marketplace quality. During signup:

1. The user selects a Job Title from the predefined `DECISION_MAKER_ALLOWED_TITLES` list.
2. If the user selects `Other`, they must supply a `customJobTitle` value.
3. The backend stores:
   - `jobTitle`: set to `"Pending Approval"`
   - `jobTitleStatus`: `pending`
   - `submittedCustomJobTitle`: the user provided custom value
4. A Super Admin can approve the pending title via:
   `POST /api/admin/decision-maker/:id/approve-job-title`
5. Upon approval the user document is updated:
   - `jobTitle` := `submittedCustomJobTitle`
   - `jobTitleStatus` := `approved`
   - `submittedCustomJobTitle` removed

### Data Model Additions (MongoDB User Schema)
```ts
jobTitle: string;
jobTitleStatus: 'approved' | 'pending' | 'rejected' | 'none';
submittedCustomJobTitle?: string;
```

### Validation Logic
Implemented in `shared/schema.ts` using Zod:
- Ensures `customJobTitle` is provided when `jobTitle === 'Other'`.

### Frontend Changes
File: `client/src/pages/signup/decision-maker/professional-info.jsx`
- Replaced free text job title input with a dropdown.
- Shows conditional input for custom job title when selecting `Other`.

### Future Enhancements
- Add an admin dashboard view listing all pending titles.
- Add rejection endpoint with reason field.
- Email notification to user on approval/rejection.
- Audit log for title change actions.

### Current Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/decision-maker/pending-job-titles | List users with pending custom job titles |
| POST | /api/admin/decision-maker/:id/approve-job-title | Approve a pending custom job title |

---
Last updated: {{DATE}}