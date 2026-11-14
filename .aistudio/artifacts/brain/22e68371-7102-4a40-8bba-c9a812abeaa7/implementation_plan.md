# Streamlined Gathering Experience & Extended Invite Codes

A cohesive overhaul of NaddD's gathering planner that simplifies disjointed workflows into a unified 3-step planning flow, places the "Enter Invite Code" option prominently in both the top navigation and login screen, and extends invite code lifetimes from ephemeral limits to 7 days or permanent validity.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed based on your feedback:
> - **Invite Code Lifetime**: Set default expiration to 7 days, with an explicit toggle for "No expiration (Permanent code)".
> - **Invite Code Placement**: Position a prominent "Join with Code" action in both the top header navigation and the Login/Welcome screen so invited friends can enter codes immediately.
> - **Unified Gathering Flow**: Replace fragmented, disconnected screens with a clear 3-step Gathering Planner (1. Who's Gathering -> 2. Best Mutual Time Slot -> 3. Location & Shareable Invites).

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the scattered gathering tools (separate groups, matcher dates, and manual event forms) into a connected, effortless experience. Users and their friends can easily generate and join via shareable codes with flexible validity periods (7 days or permanent), while a unified 3-step flow guides organizers from circle selection to date matching and confirmed invitations.
- **Target Audience / Persona**: Friend circles, organizers, dinner clubs, and busy peers trying to find mutual free time without confusion or expiring links.
- **Key Value**: Removes cognitive friction, makes invite codes trivial to find and enter for new or returning friends, and prevents lost plans caused by premature code expiration.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Entering an Invite Code (Zero-Friction Access)**:
     - *From Login Page*: A dedicated "Have an invite code? Enter code to join circle" action opens a clean modal. The user types or pastes the code (e.g. `NADD-4821`), sees the circle name immediately, and joins either as a guest or with their account.
     - *From Main App (Top Navigation)*: A visible "Enter Code" ticket button in the top bar allows instant code redemption at any time without having to hunt inside the Circles tab.
  2. **Generating & Managing Invite Codes**:
     - Within a circle or when creating a gathering, the organizer clicks "Invite Friend".
     - The code generator provides a lifetime selector: `7 Days (Default)` or `No Expiration`.
     - 1-click "Copy Code & Share Message" formats an easy message (e.g. *"Join our Brunch Club on NaddD! Code: NADD-4821 (Valid for 7 days)"*).
  3. **Unified 3-Step Gathering Planner**:
     - *Step 1: Circle & Friends*: Select which circle is meeting (or start a one-off gathering).
     - *Step 2: Mutual Time Matching*: Instantly previews group calendar availability with highlighted best days right in the flow (no need to open a separate "Matcher" tab).
     - *Step 3: Gathering Details & Confirmation*: Add title, location, or virtual link, and automatically dispatch invitations or generate one-time codes for friends who haven't joined yet.

- **Visual Identity & Theme**:
  - *Warm Organic Palette*: Dominant soft parchment canvas (`#FDFCF8`), warm slate text (`#3D3A35`), sage accent (`#8A9A5B`), and warm border hairlines (`#E8E4D9`).
  - *Hierarchy & Anti-Slop*: Strict adherence to unboxed text metadata, no code-comment prefixes, clean 3-zone header layout, and balanced typography.
  - *Code Display*: High-legibility monospaced tracking for invite codes (`font-mono tracking-wider`), accompanied by a clear expiration date pill or "No Expiration" marker.

- **Interactive Feedback & Motion**:
  - Smooth modal transitions ($\le 180\text{ms}$).
  - Live code validation feedback (shows green check with group name before submit).
  - Clear toast notifications when joining a circle or copying invite links.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Invite Code Expiration Logic**:
  - *Chosen Approach*: Store `expiresAt: string | null` on `GroupInviteCode`. Default to `now + 7 days`. If "No expiration" is chosen, `expiresAt` is set to `null` (permanent). During validation, compare `new Date() < new Date(code.expiresAt)` only if `expiresAt` is present.
  - *Why*: Eliminates the frustration of codes expiring while friends take days to check messages, while giving organizers peace of mind.
  - *Alternative Considered*: Keep 24-hour limit. Rejected because user specifically reported it was too short.

- **Decision 2: Dual Entry Points for Invite Codes**:
  - *Chosen Approach*: Expose the code input dialog from both `LoginPage.tsx` (for incoming friends before signing in) and `Header.tsx` (for logged-in users anywhere in the app).
  - *Why*: Solves the user's confusion about "where to fill the invite code" without requiring navigation deep into nested tabs.

- **Decision 3: Connecting Disjointed Steps**:
  - *Chosen Approach*: Embed the Free Date Matcher engine directly into the "Plan Gathering" modal as Step 2, while retaining the standalone tab for broad monthly exploration.
  - *Why*: Unifies the steps so organizers don't have to jump across three distinct tabs just to organize one hangout.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Navigation & Auth                             │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │  LoginPage: "Join Code"   │      │  Header: "Enter Code" Btn   │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  ▼                                   ▼
         ┌─────────────────────────────────────────────────────┐
         │             Global JoinCodeModalDialog              │
         │  - Validates code & expiration (7-day / permanent)  │
         │  - Enrolls user into FriendGroup                    │
         └────────────────────────┬────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Connected 3-Step Gathering Planner                   │
│   ┌────────────────────┐   ┌────────────────────┐   ┌──────────────┐   │
│   │ Step 1: Who?       │──▶│ Step 2: When?      │──▶│ Step 3: Done │   │
│   │ Circle / Friends   │   │ Free Date Matcher  │   │ Location &   │   │
│   │                    │   │ Auto-Slot Matrix   │   │ Share Invites│   │
│   └────────────────────┘   └────────────────────┘   └──────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

- **Data Model Updates (`src/types.ts`)**:
  - `GroupInviteCode`:
    ```ts
    export interface GroupInviteCode {
      code: string;
      createdAt: string;
      expiresAt: string | null; // null for permanent, or ISO date string (7 days)
      isUsed: boolean;
      invitedEmail?: string;
      invitedName?: string;
      usedBy?: string;
      expirationType?: '7days' | 'permanent';
    }
    ```
- **Component Mapping**:
  - `Header.tsx`: Add "Enter Code" button with `<Ticket>` icon and modal trigger.
  - `LoginPage.tsx`: Add prominent "Join Circle with Invite Code" card/button with modal support.
  - `JoinCodeModal.tsx`: Extracted reusable join modal that can be summoned from either page, verifying 7-day or permanent status.
  - `NewEventModal.tsx`: Enhanced 3-step wizard integrating circle selection, group availability preview, and shareable guest invites.
