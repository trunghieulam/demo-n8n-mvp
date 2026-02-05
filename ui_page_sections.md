# N8N MVP - UI Pages and Sections

## Overview

The MVP frontend consists of 7 core pages built with React and Zustand that provide the essential workflow automation experience. Each page focuses on a specific user task with minimal, focused UI.

---

## 1. Dashboard / Workflows List Page

**URL:** `/workflows`
**Purpose:** View, organize, and manage all workflows
**Access:** After login

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│                     NAVIGATION BAR                      │
│ Logo   | Home   | Workflows (active) | Credentials      │
│                                             User | Logout│
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  WORKFLOWS LIST                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Search workflows  | Filter by tag ▼ | [+ New]    │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ WORKFLOW CARD                                   │   │
│ │ Send Slack Notification        [Pin] [More ▼] │   │
│ │ Send message when webhook...                   │   │
│ │ Status: ● Active  | Runs: 234 | Last: 1h ago  │   │
│ │ Tags: #important #slack-related                │   │
│ │                                                │   │
│ │ [Edit] [Execute] [Logs] [Duplicate] [Delete]  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ WORKFLOW CARD                                   │   │
│ │ Check Email Daily             [Pin] [More ▼]   │   │
│ │ Check email and process...                     │   │
│ │ Status: ⚪ Inactive | Runs: 0 | Never ran      │   │
│ │                                                │   │
│ │ [Edit] [Execute] [Logs] [Duplicate] [Delete]  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [< Prev] [1] [2] [3] [Next >]                        │
└─────────────────────────────────────────────────────────┘
```

### Key Components

**Search Bar**
- Real-time search by workflow name/description
- Debounced API calls as user types

**Filter by Tag**
- Dropdown to select one or more tags
- Shows count next to each tag
- "All tags" option to clear filter

**Create Workflow Button**
- `[+ New]` button opens "Create Workflow" modal

**Workflow Card**
- **Title** with pin/favorite option
- **Description** (preview of workflow purpose)
- **Status badge**: Green (Active) or Gray (Inactive)
- **Statistics**: Execution count, last run time
- **Tags**: Clickable pills to filter by tag
- **Action buttons**:
  - `Edit` - Open canvas editor
  - `Execute` - Run immediately
  - `Logs` - View execution history
  - `Duplicate` - Create copy
  - `Delete` - Remove workflow (with confirmation)

**Pagination**
- Navigate between pages (20 workflows per page)
- Show total count and current page

### Zustand Store: `workflowStore`
```typescript
workflowStore = {
  workflows: Workflow[],        // All user workflows
  selectedWorkflow: Workflow|null,
  isLoading: boolean,
  searchQuery: string,
  selectedTags: string[],
  pagination: { total, limit, offset },

  actions: {
    fetchWorkflows(params?),
    createWorkflow(name, description?),
    createWorkflowFromTemplate(templateId, name, description?),
    updateWorkflow(id, updates),
    deleteWorkflow(id),
    duplicateWorkflow(id, newName),
    activateWorkflow(id),
    deactivateWorkflow(id),
    setSelectedWorkflow(workflow),
    setSearchQuery(query),
    setSelectedTags(tags)
  }
}
```

### User Interactions
1. Click `[+ New]` → Modal opens → Create workflow
2. Click `[Edit]` → Navigate to Canvas Editor
3. Click `[Execute]` → Confirm & start execution → Show success toast
4. Click `[Logs]` → Navigate to Execution Logs page
5. Click `[Duplicate]` → Modal prompts for new name → Create copy
6. Click `[Delete]` → Confirmation dialog → Delete if confirmed
7. Type in search → Auto-filter results
8. Click tag name → Filter by that tag

---

## 2. Canvas Editor Page

**URL:** `/workflows/{workflowId}`
**Purpose:** Visually design workflows by creating nodes and connections
**Access:** From Workflows List (Edit button) or Create Workflow modal

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│                     NAVIGATION BAR                      │
└─────────────────────────────────────────────────────────┘
┌──────┬─────────────────────────────────────────────────┐
│      │  CANVAS EDITOR                                  │
│ SIDE │  ┌────────────────────────────────────────────┐ │
│ PANE │  │  [+] [Fit] [Zoom] [Undo] [Redo]  [Save]   │ │
│      │  │                                             │ │
│      │  │         ┌──────────────┐                   │ │
│ NODE │  │         │   Webhook    │                   │ │
│ LIST │  │         │   (node_1)   │                   │ │
│      │  │         └──────┬───────┘                   │ │
│ ───  │  │                │                             │ │
│      │  │         ┌──────▼───────┐                   │ │
│ HTTP │  │         │  HTTP Req    │                   │ │
│      │  │         │  (node_2)    │                   │ │
│ SLACK│  │         └──────┬───────┘                   │ │
│      │  │                │                             │ │
│ FUNC │  │         ┌──────▼───────┐                   │ │
│      │  │         │ Set Variable │                   │ │
│      │  │         │ (node_3)     │                   │ │
│ MERGE│  │         └──────────────┘                   │ │
│      │  │                                             │ │
│      │  │ [⚙ Settings] [▶ Execute] [⬇ Data]         │ │
│      │  └────────────────────────────────────────────┘ │
│      │                                                  │
│ NODE │  NODE DETAILS PANEL (right side)                │
│DETAIL│  ┌────────────────────────────────────────────┐ │
│ PANE │  │ Webhook Configuration                      │ │
│      │  │ Path: [my-webhook____________]             │ │
│      │  │ Method: [POST         ▼]                   │ │
│      │  │ [Credentials needed? No]                   │ │
│      │  │                                             │ │
│      │  │ [+ Add Credential] [Test Webhook]          │ │
│      │  │                                             │ │
│      │  │ ⓘ Webhook URL:                             │ │
│      │  │ https://n8n.example.com/webhook/abc123... │ │
│      │  └────────────────────────────────────────────┘ │
└──────┴─────────────────────────────────────────────────┘
```

### Key Sections

**Top Toolbar**
- `[+]` Add new node button (opens node type selector)
- `[Fit]` Zoom to fit all nodes
- `[Zoom]` Zoom in/out controls
- `[Undo]` Undo last action
- `[Redo]` Redo last action
- `[Save]` Save workflow (primary action)

**Left Sidebar: Node Palette**
- List of available node types with icons
- Drag node from list → drop on canvas
- Search/filter node types
- Expand categories (Triggers, Core, Integrations)

**Canvas Area**
- **Interactive canvas** with pan and zoom
- **Nodes** displayed as draggable boxes with:
  - Node type icon
  - Node name/label
  - Input ports (left side)
  - Output ports (right side)
  - Blue dots for connection points
- **Connections** drawn as lines between node ports
- **Selection** - Click node to select (highlight border)
- **Drag** - Move node around canvas
- **Right-click** - Context menu (delete, duplicate, properties)

**Right Panel: Node Configuration**
- **Header**: Node name, type, and delete button
- **Parameters section**: Input fields specific to selected node type
  - Example for HTTP node:
    - URL field
    - Method dropdown (GET, POST, etc.)
    - Headers JSON editor
    - Body editor
- **Credentials section**: If node needs auth
  - Dropdown to select credential
  - `[+ Add Credential]` button
  - `[Test]` button to verify
- **Help section**: Description and documentation link

**Bottom Quick Actions**
- `[⚙ Settings]` - Workflow-level settings (timeout, concurrency)
- `[▶ Execute]` - Execute workflow now
- `[⬇ Data]` - View execution data from last run

### Zustand Stores: `workflowStore`, `canvasStore`
```typescript
workflowStore = {
  workflows: Workflow[],
  selectedWorkflow: Workflow|null,
  isLoading: boolean,
  searchQuery: string,
  selectedTags: string[],
  pagination: { total, limit, offset },

  actions: {
    fetchWorkflows(params?),
    createWorkflow(name, description?),
    createWorkflowFromTemplate(templateId, name, description?),
    updateWorkflow(id, updates),
    deleteWorkflow(id),
    duplicateWorkflow(id, newName),
    activateWorkflow(id),
    deactivateWorkflow(id),
    setSelectedWorkflow(workflow),
    setSearchQuery(query),
    setSelectedTags(tags)
  }
}

canvasStore = {
  selectedNodeId: string|null,      // Currently selected node
  panOffset: { x, y },              // Canvas pan position
  zoom: number,                     // Zoom level (1.0 = 100%)

  actions: {
    selectNode(nodeId),
    panCanvas(dx, dy),
    zoomCanvas(factor),
    fitToScreen()
  }
}

// Note: UI state (modals, notifications) is managed locally in components
// Execution state is fetched directly in ExecutionLogsPanel component
```

### User Interactions
1. Drag node from palette → Drop on canvas → Node added
2. Click node → Select it → Show config on right panel
3. Edit node parameters → Node updated in real-time
4. Drag from output port → Drag to input port → Create connection
5. Right-click connection → Delete → Remove connection
6. Click `[Save]` → API call → Show success toast
7. Click `[Execute]` → Show modal with options → Execute → Show results
8. Click `[Undo]` → Revert last action
9. Click `[+ Add Credential]` → Navigate to Credentials page in new tab

---

## 3. Execution Logs Page

**URL:** `/workflows/{workflowId}/executions` or `/executions`
**Purpose:** View workflow execution history and details
**Access:** From Workflows List (Logs button) or Canvas Editor

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│                     NAVIGATION BAR                      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  EXECUTION LOGS                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Workflow: Send Slack Notification                │  │
│ │ Filter: [Status ▼] [Date Range ▼]  [🔄 Refresh] │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Execution Log Entry                               │  │
│ │ Status: ✓ SUCCESS | Time: 2024-01-20 16:00:05   │  │
│ │ Duration: 5,234ms | Mode: Manual                 │  │
│ │ Node results:                                     │  │
│ │   • node_1 (Webhook): ✓ Success in 50ms          │  │
│ │   • node_2 (HTTP): ✓ Success in 4.2s             │  │
│ │   • node_3 (Slack): ✓ Success in 984ms           │  │
│ │                                                  │  │
│ │ [View Details] [Retry] [Download Data]           │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Execution Log Entry                               │  │
│ │ Status: ✗ ERROR | Time: 2024-01-20 15:30:22     │  │
│ │ Duration: 2,456ms | Mode: Webhook                │  │
│ │ Error: HTTP 401 Unauthorized from Slack API      │  │
│ │ Node where error occurred:                       │  │
│ │   • node_3 (Slack): ✗ Failed - Invalid token    │  │
│ │                                                  │  │
│ │ [View Details] [Retry] [Download Data]           │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Execution Log Entry                               │  │
│ │ Status: ⏳ RUNNING | Time: Started 2024-01-20... │  │
│ │ Progress: 2/3 nodes completed                    │  │
│ │   • node_1 (Webhook): ✓ Complete                 │  │
│ │   • node_2 (HTTP): ⏳ Running...                  │  │
│ │   • node_3 (Slack): ⌛ Waiting                    │  │
│ │                                                  │  │
│ │ [View Details] [Stop Execution]                  │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ [< Prev] [1] [2] [3] [Next >]                        │
└─────────────────────────────────────────────────────────┘
```

### Key Components

**Filter Section**
- **Workflow selector** (if viewing all executions)
- **Status filter**: All, Success, Error, Running, Waiting
- **Date range picker**: Last 24h, Last 7d, Custom range
- **Refresh button**: Manually refresh execution list

**Execution Log Entry Card**
- **Status badge**:
  - ✓ Green (Success)
  - ✗ Red (Error)
  - ⏳ Blue (Running)
  - ⌛ Orange (Waiting)
- **Timestamp**: When execution started/finished
- **Duration**: Total execution time in milliseconds
- **Mode**: How it was triggered (Manual, Webhook, Trigger, etc.)
- **Error message** (if failed): Summary of error
- **Node results list**: Status of each node in execution order
  - Icon, node name, execution status, duration
- **Action buttons**:
  - `[View Details]` - Expand to see full execution data and logs
  - `[Retry]` - Re-run this execution
  - `[Stop Execution]` - Stop if still running
  - `[Download Data]` - Export execution data as JSON

**Details Expansion**
When user clicks `[View Details]`, show:
```
Execution Details
├─ Node: node_2 (HTTP Request)
│  ├─ Status: Success
│  ├─ Started: 2024-01-20 16:00:01Z
│  ├─ Duration: 4,200ms
│  ├─ Input: {
│  │   "url": "https://api.example.com/...",
│  │   "method": "POST"
│  │ }
│  └─ Output: {
│     "statusCode": 200,
│     "body": {...}
│   }
├─ Node: node_3 (Slack)
│  └─ ...
```

### Execution State Management
```typescript
// Executions are managed via component state and API calls
// No separate Zustand store - state is local to ExecutionLogsPanel component

// Component state includes:
- executions: Execution[]
- selectedExecution: Execution|null
- filter: { status, workflowId }
- isLoading: boolean
- isRefreshing: boolean

// Actions via API client:
- fetchExecutions(filters)
- fetchExecutionDetails(executionId)
- retryExecution(executionId)
- deleteExecution(executionId)
```

### Real-Time Updates
- WebSocket connection subscribes to execution updates
- When execution completes, refresh the card automatically
- Show live progress for running executions
- Play notification sound on completion (optional)

### User Interactions
1. Filter by status → List updates
2. Select date range → List updates
3. Click `[View Details]` → Expand to show node-by-node data
4. Click `[Retry]` → Confirm → New execution starts
5. Click `[Stop Execution]` → Confirm → Execution stops
6. Click `[Download Data]` → Export JSON with full execution trace

---

## 4. Credentials Manager Page

**URL:** `/credentials`
**Purpose:** Create, manage, and test API credentials
**Access:** From Navigation Bar or Canvas Editor

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│                     NAVIGATION BAR                      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  CREDENTIALS MANAGER                                    │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Filter by type: [All Types ▼]  | [+ New]         │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ ┌────────────────────────────────────────────────────┐ │
│ │ CREDENTIAL CARD                                    │ │
│ │ Slack API Key #1              [Edit] [Delete] [▼]│ │
│ │ Type: Slack OAuth 2.0                             │ │
│ │ Created: 2024-01-15                               │ │
│ │ Status: ✓ Valid (tested 5m ago)                   │ │
│ │ Used in: 3 workflows                              │ │
│ │                                                   │ │
│ │ [Test] [Copy to Clipboard (path)]                │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌────────────────────────────────────────────────────┐ │
│ │ CREDENTIAL CARD                                    │ │
│ │ GitHub Token                  [Edit] [Delete] [▼]│ │
│ │ Type: HTTP Bearer Token                           │ │
│ │ Created: 2024-01-18                               │ │
│ │ Status: ⚠ Untested                                │ │
│ │ Used in: 1 workflow                               │ │
│ │                                                   │ │
│ │ [Test] [Copy to Clipboard (path)]                │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌────────────────────────────────────────────────────┐ │
│ │ CREDENTIAL CARD                                    │ │
│ │ Basic Auth - Old               [Edit] [Delete] [▼]│ │
│ │ Type: HTTP Basic Auth                             │ │
│ │ Created: 2024-01-01                               │ │
│ │ Status: ✗ Invalid (tested 2d ago)                 │ │
│ │ Used in: 0 workflows                              │ │
│ │                                                   │ │
│ │ [Test] [Copy to Clipboard (path)]                │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Create / Edit Credential Modal

```
┌──────────────────────────────────────────────────┐
│ CREATE CREDENTIAL                              X │
├──────────────────────────────────────────────────┤
│                                                  │
│ Credential Name: [Slack API Key________]        │
│                                                  │
│ Credential Type: [Slack OAuth 2.0    ▼]         │
│                                                  │
│ OAuth Token: [xoxb-12345..._________]           │
│                                                  │
│ ⓘ This credential will be encrypted and stored │
│   securely on your n8n instance.                │
│                                                  │
│ [Cancel]  [Test]  [Save]                        │
└──────────────────────────────────────────────────┘
```

### Key Components

**Credential Card**
- **Name** - User-defined credential name
- **Type** - Credential type (Slack, GitHub, HTTP Basic, etc.)
- **Created date** - When credential was created
- **Status badge**:
  - ✓ Green (Valid - recently tested successfully)
  - ⚠ Orange (Untested)
  - ✗ Red (Invalid - test failed)
- **Usage count** - Number of workflows using this credential
- **Action buttons**:
  - `[Edit]` - Modify credential details
  - `[Delete]` - Remove credential
  - `[Test]` - Verify credential works
  - `[More ▼]` - Additional options

**New Credential Button**
- Click `[+ New]` → Select credential type → Modal opens

**Credential Type Selector**
```
Select Credential Type:
├─ HTTP
│  ├─ HTTP Basic Auth
│  ├─ HTTP Bearer Token
│  └─ HTTP Custom Auth
├─ Slack
│  └─ Slack OAuth 2.0
├─ GitHub
│  └─ GitHub OAuth 2.0
└─ [Show All]
```

**Create/Edit Modal**
- **Name field**: User-friendly name for credential
- **Type field**: Read-only (set when creating)
- **Dynamic fields**: Vary by credential type
  - Slack OAuth: token field
  - GitHub: token field
  - HTTP Basic: username, password fields
- **Buttons**:
  - `[Cancel]` - Close without saving
  - `[Test]` - Verify credential (calls API)
  - `[Save]` - Encrypt and store credential

### Zustand Store: `credentialStore`
```typescript
credentialStore = {
  credentials: Credential[],
  isLoading: boolean,

  actions: {
    fetchCredentials(typeFilter?),
    createCredential(name, type, data),
    updateCredential(id, updates),
    deleteCredential(id),
    testCredential(id)
  }
}
```

### User Interactions
1. Click `[+ New]` → Select type → Modal opens
2. Enter credential name and details → Click `[Save]` → Store credential
3. Click `[Test]` → Call verification API → Show result (success/error)
4. Click `[Edit]` → Modal opens with current values → Update → Save
5. Click `[Delete]` → Confirmation → Remove credential
6. Filter by type → List updates
7. Click `[Copy to Clipboard]` → Copy credential ID/path for use in workflows

---

## 5. Settings Page (Basic)

**URL:** `/settings`
**Purpose:** User profile and app preferences
**Access:** From Navigation Bar (User menu)

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│                     NAVIGATION BAR                      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  SETTINGS                                               │
│                                                         │
│ Profile                                                 │
│ ┌──────────────────────────────────────────────────┐   │
│ │ First Name:  [John_____________]                 │   │
│ │ Last Name:   [Doe_____________]                  │   │
│ │ Email:       [john@example.com] (read-only)      │   │
│ │ Joined:      2024-01-15 (read-only)              │   │
│ │                                                  │   │
│ │ [Save Changes]                                   │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ Security                                                │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Change Password                                  │   │
│ │ Current Password: [________________]             │   │
│ │ New Password:     [________________]             │   │
│ │ Confirm Password: [________________]             │   │
│ │                                                  │   │
│ │ [Change Password]                                │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ Account                                                 │
│ ┌──────────────────────────────────────────────────┐   │
│ │ [Export All Data]  [Delete Account]              │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ API Keys (future)                                       │
│ ┌──────────────────────────────────────────────────┐   │
│ │ You can create API keys for programmatic access │   │
│ │ [Coming Soon]                                    │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Sections

**Profile**
- First Name, Last Name (editable)
- Email, Joined date (read-only)
- Save button

**Security**
- Change password form
- Current password validation
- Password strength indicator (future)

**Account**
- Export all user data as JSON (GDPR)
- Delete account with confirmation

### Zustand Store: `authStore`
```typescript
authStore = {
  user: User|null,
  token: string|null,
  isAuthenticated: boolean,
  isLoading: boolean,

  actions: {
    login(email, password),
    register(email, password, firstName, lastName),
    logout(),
    fetchUser(),
    // Profile updates handled via API client directly
  }
}
```

### User Interactions
1. Edit profile fields → Click `[Save Changes]` → Update and show toast
2. Enter password info → Click `[Change Password]` → Validate → Update
3. Click `[Export All Data]` → Download JSON file
4. Click `[Delete Account]` → Confirmation → Delete and redirect to login

---

## Navigation & Routing

```
/login                          → Login page (before auth)
/register                       → Register page (before auth)

/workflows                      → Dashboard (Workflows List)
/workflows/{id}                → Canvas Editor
/workflows/{id}/executions     → Execution Logs

/executions                     → All Executions (cross-workflow)

/credentials                    → Credentials Manager

/settings                       → Settings page

/:notfound                      → 404 Page
```

---

## Global Navigation Bar

Present on all authenticated pages:

```
┌───────────────────────────────────────────────────────────────┐
│ [n8n Logo] | Workflows | Credentials | Executions | Settings │
│                              [John Doe ▼] [Logout]            │
└───────────────────────────────────────────────────────────────┘
```

- `[n8n Logo]` - Click to go to dashboard
- Links to main pages
- User menu dropdown:
  - View profile
  - Settings
  - Logout

---

## Key UI Patterns

### Modals
- Create/Edit Workflow modal
- Create/Edit Credential modal
- Confirmation dialogs (delete)
- Settings/configuration modals

### Notifications / Toasts
- Success: "Workflow saved successfully" (green, auto-dismiss 3s)
- Error: "Failed to save workflow: ..." (red, manual dismiss)
- Info: "Executing workflow..." (blue, auto-dismiss)

### Loading States
- Skeleton screens for lists
- Spinner overlay for modal actions
- Disabled buttons during async operations

### Empty States
- No workflows: "Create your first workflow" with button
- No executions: "No execution history yet"
- No credentials: "Add credentials to use in workflows"

---

## Responsive Design Notes

**MVP:** Desktop-first (1024px+ width)
- Can add mobile support in future
- Use CSS grid for responsive layouts
- Modals always full-width on mobile
- Canvas may not work well on mobile (future improvement)

---

## Accessibility (a11y)

- Semantic HTML (buttons, labels, forms)
- ARIA labels for interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Color contrast meets WCAG AA standards
- Focus indicators visible

---

## State Management Summary

| Page | Primary Store(s) | Key State |
|------|------------------|-----------|
| Workflows List | `workflowStore` | Workflows, search, filter, pagination |
| Canvas Editor | `workflowStore`, `canvasStore` | Current workflow, nodes, connections, selected node |
| Execution Logs | Component state | Executions, filter, selected execution |
| Credentials | `credentialStore` | Credentials, type filter |
| Settings | `authStore` | User profile, authentication state |

All stores use Zustand for centralized state management. Execution updates are fetched via API polling or WebSocket when available.
