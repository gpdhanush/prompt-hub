# IT Asset Management System

## Overview

The IT Asset Management system provides comprehensive tracking and management of IT assets including laptops, mobile devices, accessories, and other equipment. The system supports role-based access control where:

- **Admin (Level 2 users)**: Full access to all IT Asset Management features
- **Employees**: Simplified view to see their assigned assets and raise requests

## Database Schema

### Tables Created

1. **asset_categories** - Master table for asset types (Laptop, Mobile, Accessories, etc.)
2. **assets** - Main inventory table with asset details
3. **asset_laptop_details** - Laptop-specific information (OS, RAM, Storage, etc.)
4. **asset_mobile_details** - Mobile device details (IMEI, device type, etc.)
5. **asset_accessory_details** - Accessory specifications
6. **asset_assignments** - Tracks asset assignments to employees
7. **asset_tickets** - Request/ticket management system
8. **asset_audit_logs** - Complete audit trail for all asset actions
9. **asset_maintenance** - Maintenance and repair tracking

### Migration

Run the migration script to create all tables:

```bash
mysql -u root -p prasowla_ntpl_admin < database/migrations/add_it_asset_management.sql
```

## Features

### Admin Features

1. **Dashboard**
   - Total Assets overview
   - Assigned vs Available counts
   - Assets Under Repair
   - Pending Tickets
   - Warranty Expiry alerts
   - Recently Assigned Devices

2. **Assets Management**
   - Add new assets (with device-specific details)
   - View asset list with filters
   - Update asset information
   - Track asset status lifecycle
   - Asset categories management

3. **Assignments**
   - Assign assets to employees
   - View active assignments
   - Return assets
   - Track assignment history
   - Condition tracking

4. **Tickets/Requests**
   - View all tickets
   - Approve/Reject requests
   - Update ticket status
   - Track ticket history

5. **Maintenance** (Placeholder)
   - Repair tracking
   - Vendor management
   - Maintenance history

6. **Inventory** (Placeholder)
   - Stock summary
   - Low stock alerts
   - Available/Assigned views

7. **Reports** (Placeholder)
   - Asset register
   - Employee asset reports
   - Assignment history
   - Warranty expiry reports

8. **Approvals** (Placeholder)
   - Ticket approvals
   - Assignment approvals
   - Replacement approvals

9. **Settings** (Placeholder)
   - Asset categories
   - Approval workflows
   - SLA rules
   - Notification settings

### Employee Features

1. **My IT Assets**
   - View assigned devices
   - See device details (laptop specs, mobile IMEI, etc.)
   - Asset condition and warranty info

2. **Raise Request**
   - New device request
   - Replacement request
   - Repair request
   - Accessory request
   - Device return
   - Damage report

3. **My Tickets**
   - View all tickets raised
   - Track ticket status
   - View admin comments

4. **Asset History**
   - View previous assignments
   - Assignment timeline

## API Endpoints

### Assets
- `GET /api/assets` - Get all assets (with filters)
- `GET /api/assets/:id` - Get asset details
- `POST /api/assets` - Create asset (Admin only)
- `PUT /api/assets/:id` - Update asset (Admin only)

### Categories
- `GET /api/assets/categories` - Get all categories
- `POST /api/assets/categories` - Create category (Admin only)

### Assignments
- `GET /api/assets/assignments/list` - Get all assignments
- `POST /api/assets/assign` - Assign asset to employee (Admin only)
- `POST /api/assets/assignments/:id/return` - Return asset (Admin only)

### Tickets
- `GET /api/assets/tickets/list` - Get all tickets
- `POST /api/assets/tickets` - Create ticket (All users)
- `PUT /api/assets/tickets/:id` - Update ticket status (Admin only)

### Dashboard
- `GET /api/assets/dashboard/stats` - Get dashboard statistics

## Role-Based Access

### Menu Visibility

| Menu | Admin | Employee |
|------|-------|----------|
| IT Asset Dashboard | ✅ | ❌ |
| Assets | ✅ | ❌ |
| Assignments | ✅ | ❌ |
| Tickets | ✅ | ✅ (Own tickets) |
| Maintenance | ✅ | ❌ |
| Inventory | ✅ | ❌ |
| Reports | ✅ | ❌ |
| Approvals | ✅ | ❌ |
| Settings | ✅ | ❌ |
| My IT Assets | ❌ | ✅ |

### API Access

- **Admin**: Full CRUD access to all endpoints
- **Employees**: 
  - Can view their assigned assets
  - Can create tickets
  - Can view their own tickets and assignment history
  - Cannot modify assets or assignments

## Asset Status Lifecycle

```
Available → Assigned → Repair → Available
                ↓
            Damaged → Retired
```

**Important**: Assets are never deleted, only status is changed to maintain audit trail.

## Ticket Types

1. **new_request** - Request for new device
2. **repair** - Request for device repair
3. **replacement** - Request for device replacement
4. **return** - Request to return device
5. **accessory_request** - Request for accessories
6. **damage_report** - Report device damage

## Ticket Flow

1. Employee raises ticket
2. Admin reviews ticket
3. Admin approves/rejects with comments
4. If approved, admin assigns asset (for new/replacement requests)
5. Ticket status updated to in_progress/resolved/closed

## Best Practices

1. **Never delete assets** - Always use status changes
2. **Maintain audit trail** - All actions are logged in `asset_audit_logs`
3. **Track conditions** - Record condition on assign and return
4. **Use asset codes** - Auto-generated unique codes for each asset
5. **Warranty tracking** - Monitor warranty expiry dates
6. **Assignment history** - Keep complete history of all assignments

## Future Enhancements

- [ ] Barcode/QR Code generation and scanning
- [ ] Bulk asset upload via Excel
- [ ] Email notifications for ticket updates
- [ ] SLA tracking and alerts
- [ ] Advanced reporting and analytics
- [ ] Asset depreciation calculation
- [ ] Integration with procurement systems
- [ ] Mobile app for asset management

## File Structure

```
src/pages/
  ├── ITAssetDashboard.tsx      # Admin dashboard
  ├── Assets.tsx                 # Asset management (Admin)
  ├── AssetAssignments.tsx       # Assignment management (Admin)
  ├── AssetTickets.tsx           # Ticket management (Admin)
  ├── AssetMaintenance.tsx       # Maintenance (Admin)
  ├── AssetInventory.tsx         # Inventory view (Admin)
  ├── AssetReports.tsx           # Reports (Admin)
  ├── AssetApprovals.tsx         # Approvals (Admin)
  ├── AssetSettings.tsx          # Settings (Admin)
  └── MyITAssets.tsx             # Employee view

server/routes/
  └── assets.js                  # All asset-related API endpoints

database/migrations/
  └── add_it_asset_management.sql # Database schema
```

## Getting Started

1. Run the database migration:
   ```bash
   mysql -u root -p prasowla_ntpl_admin < database/migrations/add_it_asset_management.sql
   ```

2. Restart the server to load new routes

3. Access the IT Asset Management module:
   - **Admin**: Navigate to "IT Asset Management" in sidebar
   - **Employee**: Navigate to "My IT Assets" in sidebar

4. Start by creating asset categories (if needed)

5. Add assets to the system

6. Assign assets to employees

7. Employees can raise tickets for requests
