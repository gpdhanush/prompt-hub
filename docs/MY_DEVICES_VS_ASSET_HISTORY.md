# My Devices vs Asset History - Explanation

## Overview
Both "My Devices" and "Asset History" are tabs within the **My IT Assets** page (`/my-it-assets`), but they serve different purposes:

## My Devices Tab

**Purpose**: Shows your **currently assigned** IT assets/devices

**What it displays**:
- Assets that are **currently assigned** to you
- Active assignments with status "active"
- Devices you are currently using

**Data Source**: 
- API: `GET /api/assets?assigned_only=true`
- Filters assets where `status = 'active'` and `assigned_to = current_user`

**Use Cases**:
- See what devices you currently have
- Check device details (brand, model, specifications)
- View current assignment information
- Request maintenance or return devices

**Example**:
```
Device: MacBook Pro 16"
Status: Active
Assigned Date: Jan 15, 2024
```

---

## Asset History Tab

**Purpose**: Shows your **complete assignment history** (past and present)

**What it displays**:
- **All** asset assignments you've ever had
- Both **active** and **returned** assignments
- Historical record of all devices assigned to you over time

**Data Source**:
- API: `GET /api/assets/assignments?status=`
- Shows all assignments regardless of status (active, returned, etc.)

**Use Cases**:
- View complete history of all devices you've used
- See when devices were assigned and returned
- Track your device usage over time
- Reference past assignments

**Example**:
```
Device: MacBook Pro 16"
Status: Returned
Assigned Date: Jan 15, 2024
Returned Date: Mar 20, 2024

Device: Dell XPS 15"
Status: Active
Assigned Date: Mar 21, 2024
Returned Date: -
```

---

## Key Differences Summary

| Feature | My Devices | Asset History |
|---------|-----------|---------------|
| **Scope** | Current assignments only | All assignments (past + present) |
| **Status Filter** | Only "active" | All statuses |
| **Purpose** | What you have now | Complete history |
| **Time Period** | Current | Historical |
| **Use Case** | Manage current devices | Track all past devices |

---

## Visual Location

Both tabs are located in:
- **Page**: `/my-it-assets`
- **Navigation**: Sidebar → "My IT Assets"
- **Tabs**: 
  - Tab 1: "My Devices" (Package icon)
  - Tab 2: "My Tickets" (Ticket icon)
  - Tab 3: "Asset History" (History icon)

---

## Technical Implementation

### My Devices
```typescript
// Fetches only active assignments
const { data: assignedAssets } = useQuery({
  queryKey: ['assets', 'my-assigned'],
  queryFn: () => assetsApi.getAll({ assigned_only: 'true' }),
});
```

### Asset History
```typescript
// Fetches all assignments (no status filter)
const { data: assignmentsData } = useQuery({
  queryKey: ['assets', 'assignments', 'my'],
  queryFn: () => assetsApi.getAssignments({ status: '' }),
});
```

---

## Summary

- **My Devices** = "What do I currently have?"
- **Asset History** = "What have I ever had?"

Both are useful for different purposes and complement each other in providing a complete view of your IT asset assignments.
