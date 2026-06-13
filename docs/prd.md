# Hestia Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** Hestia

**Product Type:** Smart stove safety system

**Platform:** Raspberry Pi-based smart home safety device with a React Progressive Web App

Hestia is a smart stove safety system designed to reduce the risk of stove-related accidents. The system is a device placed on top of stove dials. The system uses a Raspberry Pi camera to detect whether a person is near the stove. If no person is detected for a configurable timeout period, the system sounds a warning buzzer. If the user does not return before the warning delay ends, Hestia automatically turns the stove off.

The product includes a PWA (progressive web app) where users can manage households, pair devices, configure safety settings, view stove status, create timers, receive notifications, and view event history.

---

## 2. Problem Statement

Stoves are a common household safety risk when left unattended. Users may forget that a stove is on, walk away while cooking, or fail to respond to a timer. Particularly for the elderly. Traditional stove timers only alert the user but do not automatically react to absence or danger.

Hestia solves this by combining local presence detection, configurable safety rules, warning alerts, and automatic stove shutoff.

---

## 3. Goals

The MVP should allow users to:

- Create an account and log in.
- prompt to either have the paired device join exiting household or create household on signup.
- Pair a physical Hestia device using an NFC tag.
- Add a new device to either an existing household or a new household.
- Request to join a household if the device is already paired.
- Let household admins approve or deny join requests.
- View and manage stove devices from a dashboard.
- Detect whether someone is near the stove using a Raspberry Pi camera.
- Sound a warning buzzer before automatic shutoff.
- Automatically turn off the stove after a configurable absence timeout and warning delay.
- Create and cancel stove timers.
- Receive push notifications for important safety events.
- View device event history.
- Display a basic camera stream.
- Enforce role-based permissions for admins and members.

---

## 4. Non-Goals for MVP

The MVP will not include:

- Advanced AI cooking recommendations.
- Multi-camera support.
- Voice control.
- Cloud-based computer vision processing.
- Native iOS or Android apps.
- Complex analytics dashboards.
- Third-party smart home integrations such as Google Home, Alexa, or Apple HomeKit.
- Advanced emergency contact escalation.
- Payment or subscription features.

---

## 5. Target Users

### Primary Users

- Homeowners who want an extra layer of stove safety.
- Families with children, elderly family members, or forgetful users.
- Shared households where multiple people need access to the same stove safety system.

### Secondary Users

- Landlords or property managers.
- Caregivers who want visibility into stove safety events.
- Students or renters living in shared housing.

---

## 6. Core User Flow

### 6.1 Account Creation Flow

1. User opens the Hestia Progressive Web App.
2. User signs up using email and password.
3. Supabase Auth creates the user account.
4. The backend will prompt the user to either create new household or add to existing.
5. The user is added to the household as an admin.
6. User is taken to the dashboard.
7. User is prompted to pair a device.

### 6.2 Device Pairing Flow

Each Hestia device has an NFC sticker tag that contains a pairing URL.

Example:

```txt
https://hestia.app/pair?device_id=DEVICE_ID
```

When the user taps the NFC tag, the frontend opens the pairing page and checks the device status. If the user hasnt logged in, prompt to login and then proceed as needed.

---

## 7. Device Pairing Logic

### 7.1 Case A: Device Is New

A device is considered new if it is not currently assigned to any household.

Flow:

1. User taps the NFC tag.
2. App checks the device ID.
3. Backend confirms the device is not paired.
4. User is asked whether to:
   - Add the device to an existing household.
   - Create a new household.
5. User selects an option.
6. Device is assigned to the selected or newly created household.
7. Device appears on the dashboard.

### 7.2 Case B: Device Is Already Paired

A device is not new if it is already assigned to a household.

Flow:

1. User taps the NFC tag.
2. App checks the device ID.
3. Backend confirms the device already belongs to a household.
4. User is prompted: “This device already belongs to a household. Would you like to request access?”
5. If the user agrees, a join request is created.
6. Household admin receives a notification.
7. Admin approves or denies the request.
8. If approved, the user is added to the household as a member.
9. If denied, the user does not gain access.

---

## 8. Household Model

Hestia supports a many-to-many relationship between users and households.

Rules:

- A user can belong to multiple households.
- A household can have multiple users.
- A household can have multiple stove devices.
- Each user has a role within each household.
- A user may be an admin in one household and a member in another.

Example:

```txt
User A
- Admin of Household 1
- Member of Household 2

User B
- Member of Household 1
- Admin of Household 3
```

---

## 9. Roles and Permissions

There are two roles:

- `admin`
- `member`

Admins have full household management permissions. Members can use the stove safety features but cannot perform destructive or administrative actions.

| Permission | Admin | Member |
|---|---:|---:|
| Add stoves | Yes | Yes |
| Set timers | Yes | Yes |
| Cancel timers | Yes | Yes |
| Turn stove on/off | Yes | Yes |
| View stove status | Yes | Yes |
| View event history | Yes | Yes |
| View camera stream | Yes | Yes |
| Edit safety settings | Yes | Yes |
| Remove stoves | Yes | No |
| Remove members | Yes | No |
| Rename household | Yes | No |
| Delete household | Yes | No |
| Rename devices | Yes | No |

---

## 10. MVP Scope

The MVP includes the following features:

- User signup and login.
- Automatic household creation on signup.
- Household membership model.
- Device pairing through NFC.
- Device dashboard.
- Push notifications.
- Presence detection through a camera.
- Warning buzzer before shutoff.
- Configurable absence timeout.
- Configurable warning delay.
- Timer creation and cancellation.
- MQTT communication between backend and Raspberry Pi 4 CAM.
- Event logging.
- Basic camera stream display.
- Role-based permissions.

---

## 11. System Architecture

### 11.1 Frontend

**Technology:** React + Vite + Progressive Web App plugin

The frontend provides the user interface for:

- Signup and login.
- Household selection.
- Device pairing.
- Stove dashboard.
- Safety settings.
- Timer controls.
- Event history.
- Camera stream viewing.
- Join request approval.
- Push notification registration.

### 11.2 Backend

**Technology:** Express.js with REST API

The backend is responsible for:

- Verifying Supabase authentication tokens.
- Managing households.
- Managing household memberships.
- Handling device pairing.
- Enforcing role-based permissions.
- Creating and reviewing join requests.
- Managing timers.
- Storing event logs.
- Sending commands to devices through MQTT.
- Supporting push notification workflows.

### 11.3 Database and Authentication

**Technology:** Supabase

Supabase is used for:

- User authentication.
- User profile storage.
- Household data.
- Household membership data.
- Device records.
- Timers.
- Join requests.
- Event logs.
- Push notification subscriptions.

### 11.4 Server Hosting

**Technology:** Vultr

The backend server is hosted on Vultr and runs:

- Express REST API.
- MQTT bridge logic.
- Push notification logic.
- Backend services that communicate with Supabase and the local device system.

### 11.5 Local Device System

**Technology:** Raspberry Pi + Raspberry Pi Camera + MQTT + relay

The Raspberry Pi runs the local safety logic. This is important because stove shutoff should not depend fully on the cloud.

The Raspberry Pi handles:

- Camera-based presence detection.
- Absence timeout tracking.
- Warning buzzer trigger.
- Automatic stove shutoff decision.
- Local MQTT communication.
- Device status reporting.

The relay or connected microcontroller handles:

- Stove on/off simulation or relay control.
- Device-level MQTT messages.
- Status publishing.
- Receiving commands from the Raspberry Pi or backend.

---

## 12. Local Safety Logic

All critical stove safety logic runs locally on the Raspberry Pi over MQTT.

### 12.1 Absence Detection Flow

```txt
Stove is ON
↓
Raspberry Pi camera checks for person near stove
↓
Person detected?
├── Yes → Reset absence timer
└── No → Start absence timer
        ↓
        Absence timeout reached?
        ├── No → Continue monitoring
        └── Yes → Start warning buzzer
                ↓
                Warning delay reached?
                ├── No and person returns → Cancel warning
                └── Yes and no person returns → Turn stove OFF
```

### 12.2 Warning Flow

1. Stove is on.
2. No person is detected.
3. Absence timeout starts.
4. Timeout reaches configured limit.
5. Buzzer starts.
6. Warning delay starts.
7. If person returns, buzzer stops and shutoff is cancelled.
8. If no person returns, stove turns off automatically.
9. Event is logged.
10. Push notification is sent.

---

## 13. Device Dashboard Requirements

The dashboard should display each stove device as a page.

Each device page should show:

- Device name.
- Household name.
- Online or offline status.
- Stove on/off status.
- Presence detection status.
- Active timer status.
- Absence timeout value.
- Warning delay value.
- Last event.
- Camera stream access.
- Safety settings button.
- Turn stove on/off button.
- Timer controls.

Example device state:

```txt
Kitchen Stove
Status: Online
Stove: On
Presence: Detected
Timer: 12 minutes remaining
Absence timeout: 5 minutes
Warning delay: 30 seconds
Last event: Presence detected
```

---

## 14. Timer Requirements

Users can create and cancel timers for a stove device.

### Timer Features

- User can create a timer with a duration.
- User can cancel an active timer.
- Dashboard shows remaining timer time.
- When the timer finishes, an event is logged.
- User receives a push notification.

### MVP Timer Behavior

For MVP, timer expiration should notify the user and optionally turn off the stove depending on product decision.

Recommended MVP behavior:

```txt
When timer ends, Hestia sends a notification and turns off the stove.
```

This keeps the product aligned with the safety-first purpose.

---

## 15. Safety Settings Requirements

Each device should support configurable safety settings.

Settings:

- Absence timeout.
- Warning delay.

Example:

```txt
Absence timeout: 300 seconds
Warning delay: 30 seconds
```

Validation rules:

- Absence timeout must be greater than 0.
- Warning delay must be greater than 0.
- Warning delay should be shorter than the absence timeout.
- Settings changes should be logged as events.
- Members and admins can edit safety settings according to the current permission table.

---

## 16. Push Notification Requirements

The PWA should support push notifications for safety and household events.

Notification triggers:

- Stove automatically turned off.
- Warning buzzer started.
- No person detected.
- Person returned after warning.
- Timer completed.
- Timer cancelled.
- Device went offline.
- Device came online.
- Join request received.
- Join request approved.
- Join request denied.
- Device paired successfully.

Example notification:

```txt
Hestia Alert: Kitchen Stove was turned off automatically because no one was detected nearby.
```

---

## 17. Event Logging Requirements

Hestia should log important system, safety, and user actions.

Event types:

- `USER_SIGNED_UP`
- `HOUSEHOLD_CREATED`
- `MEMBER_ADDED`
- `MEMBER_REMOVED`
- `JOIN_REQUEST_CREATED`
- `JOIN_REQUEST_APPROVED`
- `JOIN_REQUEST_DENIED`
- `DEVICE_PAIRED`
- `DEVICE_REMOVED`
- `DEVICE_RENAMED`
- `STOVE_TURNED_ON`
- `STOVE_TURNED_OFF`
- `PRESENCE_DETECTED`
- `NO_PRESENCE_DETECTED`
- `WARNING_BUZZER_STARTED`
- `WARNING_CANCELLED`
- `AUTO_SHUTOFF_TRIGGERED`
- `TIMER_CREATED`
- `TIMER_CANCELLED`
- `TIMER_COMPLETED`
- `SAFETY_SETTINGS_UPDATED`
- `CAMERA_STREAM_VIEWED`

Each event should include:

- Event ID.
- Household ID.
- Device ID, if applicable.
- User ID, if applicable.
- Event type.
- Timestamp.
- Metadata.

---

## 18. Suggested Database Schema

### 18.1 profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  created_at timestamp with time zone default now()
);
```

### 18.2 households

```sql
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);
```

### 18.3 household_members

```sql
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  created_at timestamp with time zone default now(),
  unique (household_id, user_id)
);
```

### 18.4 devices

```sql
create table devices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete set null,
  device_name text default 'Kitchen Stove',
  pairing_code text unique not null,
  is_paired boolean default false,
  online_status boolean default false,
  stove_status text check (stove_status in ('on', 'off')) default 'off',
  presence_status text check (presence_status in ('detected', 'not_detected')) default 'not_detected',
  absence_timeout_seconds integer default 300,
  warning_delay_seconds integer default 30,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### 18.5 join_requests

```sql
create table join_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'approved', 'denied')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique (household_id, user_id)
);
```

### 18.6 timers

```sql
create table timers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  device_id uuid references devices(id) on delete cascade,
  created_by uuid references auth.users(id),
  duration_seconds integer not null,
  status text default 'active' check (status in ('active', 'cancelled', 'completed')),
  started_at timestamp with time zone default now(),
  ends_at timestamp with time zone not null
);
```

### 18.7 events

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);
```

### 18.8 push_subscriptions

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default now()
);
```

---

## 19. Suggested REST API Endpoints

### 19.1 Auth

Supabase handles signup, login, and logout. The Express backend verifies the Supabase JWT for protected routes.

### 19.2 Households

```txt
GET /api/households
POST /api/households
PATCH /api/households/:householdId
DELETE /api/households/:householdId
```

### 19.3 Household Members

```txt
GET /api/households/:householdId/members
DELETE /api/households/:householdId/members/:userId
```

### 19.4 Join Requests

```txt
POST /api/households/:householdId/join-requests
GET /api/households/:householdId/join-requests
POST /api/join-requests/:requestId/approve
POST /api/join-requests/:requestId/deny
```

### 19.5 Device Pairing

```txt
GET /api/devices/:deviceId/pairing-status
POST /api/devices/:deviceId/pair
POST /api/devices/:deviceId/request-access
```

### 19.6 Devices

```txt
GET /api/households/:householdId/devices
GET /api/devices/:deviceId
PATCH /api/devices/:deviceId
DELETE /api/devices/:deviceId
```

### 19.7 Stove Control

```txt
POST /api/devices/:deviceId/turn-on
POST /api/devices/:deviceId/turn-off
GET /api/devices/:deviceId/status
```

### 19.8 Safety Settings

```txt
PATCH /api/devices/:deviceId/safety-settings
```

### 19.9 Timers

```txt
GET /api/devices/:deviceId/timers
POST /api/devices/:deviceId/timers
DELETE /api/timers/:timerId
```

### 19.10 Events

```txt
GET /api/households/:householdId/events
GET /api/devices/:deviceId/events
```

### 19.11 Push Notifications

```txt
POST /api/push/subscribe
DELETE /api/push/unsubscribe
```

---

## 20. MQTT Topic Design

Suggested MQTT topics:

```txt
hestia/devices/{deviceId}/status
hestia/devices/{deviceId}/presence
hestia/devices/{deviceId}/events
hestia/devices/{deviceId}/commands
hestia/devices/{deviceId}/settings
hestia/devices/{deviceId}/timers
```

### Example Command Message

```json
{
  "command": "TURN_OFF",
  "source": "backend",
  "timestamp": "2026-06-12T23:30:00Z"
}
```

### Example Status Message

```json
{
  "deviceId": "device_123",
  "online": true,
  "stoveStatus": "on",
  "presence": "detected",
  "buzzer": "off",
  "activeTimerSecondsRemaining": 720,
  "timestamp": "2026-06-12T23:30:00Z"
}
```

### Example Safety Settings Message

```json
{
  "absenceTimeoutSeconds": 300,
  "warningDelaySeconds": 30
}
```

---

## 21. Functional Requirements

### FR1: User Signup and Login

Users must be able to create an account and log in using Supabase Auth.

Acceptance criteria:

- User can create an account.
- User can log in.
- User can log out.
- User session persists in the PWA.
- A default household is created after signup.

### FR2: Automatic Household Creation

When a user signs up, the backend must create a default household. It should prompt them to either add to household or to create new.

Acceptance criteria:

- New user has at least one household.
- New user is assigned as admin of that household.
- User can rename the household later.

### FR3: NFC Device Pairing

Users must be able to pair a device by tapping an NFC tag.

Acceptance criteria:

- NFC tag opens the pairing page.
- App reads the device ID from the URL.
- App checks whether the device is new or already paired.
- New devices can be added to existing or new households.
- Already paired devices require a join request.

### FR4: Join Request Approval

Users must request access before joining an existing paired device household.

Acceptance criteria:

- Non-member can request access.
- Admin receives a join request.
- Admin can approve or deny the request.
- Approved user becomes a member.
- Denied user does not gain access.

### FR5: Device Dashboard

Users must be able to view devices in households they belong to.

Acceptance criteria:

- User can switch between households.
- User can view devices in selected household.
- Device status updates are shown.
- User can access timer, settings, and camera stream controls.

### FR6: Presence Detection

The Raspberry Pi must detect whether someone is near the stove.

Acceptance criteria:

- Camera-based detection runs locally.
- Presence state is updated.
- Absence timer starts when no person is detected.
- Absence timer resets when person returns.

### FR7: Warning Buzzer

The system must sound a buzzer before automatic shutoff.

Acceptance criteria:

- Buzzer starts after absence timeout.
- Buzzer stops if person returns.
- Buzzer event is logged.
- User receives a push notification.

### FR8: Automatic Stove Shutoff

The system must turn off the stove if no person returns before the warning delay ends.

Acceptance criteria:

- Stove turns off after absence timeout plus warning delay.
- Shutoff happens locally.
- Event is logged.
- Push notification is sent.

### FR9: Safety Settings

Users must be able to configure absence timeout and warning delay.

Acceptance criteria:

- User can update absence timeout.
- User can update warning delay.
- Settings are saved in Supabase.
- Settings are sent to the Raspberry Pi through MQTT.
- Settings update is logged.

### FR10: Timers

Users must be able to create and cancel timers.

Acceptance criteria:

- User can create a timer.
- User can cancel a timer.
- Timer appears on dashboard.
- Timer completion is logged.
- Timer completion triggers a push notification.

### FR11: Event History

Users must be able to view event history.

Acceptance criteria:

- Events are shown by household.
- Events include timestamp, device, event type, and metadata.
- User can view stove safety events.
- User can view pairing and membership events.

### FR12: Role-Based Permissions

The backend must enforce permissions based on user role.

Acceptance criteria:

- Admin-only actions are blocked for members.
- Members can use allowed stove controls.
- Unauthorized requests return an error.
- Permissions are enforced on the backend, not only the frontend.

---

## 22. Non-Functional Requirements

### Reliability

- Local shutoff logic must continue working even if the cloud server is unavailable.
- Raspberry Pi should store or queue events if temporarily offline.

### Security

- All protected API routes must verify Supabase JWT.
- Users can only access households they belong to.
- Role permissions must be checked on the backend.
- Device pairing URLs should use secure, hard-to-guess pairing codes.
- Camera stream access must require authentication.

### Performance

- Dashboard should load within 2 seconds on a normal connection.
- Device status updates should appear near real-time.
- Local safety detection should not depend on cloud latency.

### Privacy

- Camera processing should run locally on the Raspberry Pi.
- Camera stream should only be viewable by authorized household members.
- Event logs should avoid storing unnecessary image or video data.

### Scalability

- A user can belong to multiple households.
- A household can support multiple devices.
- The backend should support multiple simultaneous users per household.

---

## 23. Success Metrics

MVP success can be measured by:

- User can complete signup and pairing without developer help.
- Device can detect absence and trigger buzzer.
- Device can automatically shut off after timeout.
- Dashboard shows real-time stove status.
- Push notifications are delivered for safety events.
- Join request flow works correctly.
- Role-based permissions prevent unauthorized actions.
- Event logs accurately record major user and safety events.

---

## 24. Open Questions

1. Should members be allowed to edit safety settings, or should that be admin-only?
2. Should timer expiration always turn off the stove, or only notify the user?
3. Should the product use the role name `admin` or `owner` consistently?
4. How will the physical stove shutoff mechanism work in the prototype?
5. Should the camera stream be available at all times, or only when the stove is on?
6. Should join requests expire after a certain time?
7. Should admins receive push notifications, email notifications, or both for join requests?
8. What should happen if the Raspberry Pi loses internet but still detects danger?
9. Should the dashboard show confidence level for camera presence detection?
10. Should event logs be editable, exportable, or read-only?

---

## 25. Recommended MVP Build Order

1. Supabase Auth setup.
2. User profile and automatic household creation.
3. Household membership database model.
4. Role-based permission middleware.
5. Device database model.
6. NFC pairing URL flow.
7. Device pairing for new devices.
8. Join request flow for already paired devices.
9. Basic dashboard with household and device cards.
10. MQTT communication setup.
11. Raspberry Pi camera presence detection.
12. Absence timeout and warning delay logic.
13. Buzzer trigger.
14. Stove on/off command simulation.
15. Timer creation and cancellation.
16. Event logging.
17. Push notifications.
18. Camera stream display.
19. Final permission testing.
20. End-to-end demo testing.

---

## 26. MVP Summary

Hestia’s MVP focuses on the core safety loop: detecting when a stove is unattended, warning the user, and turning the stove off automatically. The product also includes the account, household, pairing, dashboard, notification, timer, and permission systems needed to make the device usable in a real multi-user household.

The most important MVP principle is that critical safety logic should run locally on the Raspberry Pi, while the cloud backend and PWA provide account management, remote visibility, device configuration, notifications, and event history.
