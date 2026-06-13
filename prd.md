# Product Requirements Document: Hestia

## 1. Product Overview

### Product Name
**Hestia**

### Product Type
Smart stove safety device with companion Progressive Web App, voice control, NFC pairing, and household-based device sharing.

### Concept Summary
Hestia is a smart stove safety system designed to reduce the risk of unattended cooking fires. The device monitors whether a person is physically near the stove using an ultrasonic distance sensor. If no person is detected nearby for a configured amount of time, Hestia warns the user with a buzzer and then automatically turns off the stove.

For demo purposes, the stove on/off state is simulated using an LED. In a future production version, the LED simulation would be replaced by a certified stove shutoff relay or smart appliance integration.

Users can control Hestia through:

- A React PWA installed from Safari on iPhone
- NFC-based pairing using a passive NTAG213 sticker
- Voice commands captured through a Logitech Webcam microphone
- Timer controls
- Remote stove shutoff
- Camera stream viewing from the ESP32 CAM

The physical device communicates with a Raspberry Pi 4B master server through MQTT. The Raspberry Pi hosts the backend API, local SQLite database, MQTT broker, Whisper voice pipeline, and orchestration logic.

---

## 2. Problem Statement

Cooking fires often occur when a stove is left unattended. People may step away briefly and become distracted, forget that the stove is on, or assume someone else is watching it. Existing stove safety products are often expensive, difficult to install, or not designed for shared households.

Hestia addresses this by providing a low-cost, household-friendly safety system that can:

1. Detect when no person is near the stove.
2. Warn before shutting off.
3. Automatically shut off the stove after a configurable absence period.
4. Allow household members to monitor and control the stove remotely.
5. Support hands-free voice commands.
6. Make setup simple through NFC pairing.

---

## 3. Product Goals

### Primary Goals

1. **Prevent unattended stove operation**
   - Automatically detect absence and trigger warning/shutoff behavior.

2. **Make setup simple**
   - Use NFC tags so users can pair hardware without manually entering device IDs.

3. **Support household usage**
   - Devices belong to households, not individual users.
   - Household members can share access to the same stove devices.

4. **Provide multiple control interfaces**
   - PWA controls
   - Voice commands
   - Timers
   - Physical sensor automation

5. **Enable a strong demo**
   - LED represents stove power state.
   - Buzzer demonstrates warning.
   - Camera stream shows live monitoring.
   - Voice pipeline demonstrates AI command interpretation.

---

## 4. Non-Goals

The MVP will not include:

1. Real high-voltage stove shutoff hardware.
2. Certified appliance safety relay integration.
3. Native iOS or Android app.
4. Push notifications outside the installed PWA unless technically feasible.
5. Cloud-hosted production deployment.
6. Multiple households per user.
7. Advanced computer vision detection.
8. Facial recognition.
9. Payment, subscription, or billing.
10. Emergency services calling.
11. Offline remote control when the Raspberry Pi server is unavailable.

---

## 5. Target Users

### Primary User: Home Cook

A person who cooks at home and wants extra safety protection in case they walk away from the stove.

### Secondary User: Family Member or Roommate

A household member who wants visibility and control over shared stove safety.

### Tertiary User: Caregiver

A caregiver who wants to help monitor stove usage for an elderly family member or someone who may forget the stove is on.

### Demo User

A judge, teacher, or hackathon evaluator who needs to quickly understand the hardware, software, and safety logic.

---

## 6. User Personas

### Persona 1: Busy Parent

- Cooks while doing other tasks.
- May leave the kitchen to answer the door, check on children, or take a call.
- Needs automatic shutoff if distracted.

### Persona 2: Student in Shared Housing

- Shares a kitchen with roommates.
- Wants all roommates to access the same stove safety system.
- Needs simple setup and shared permissions.

### Persona 3: Elderly User with Caregiver

- May forget the stove is on.
- Needs passive safety monitoring.
- Caregiver may need to remotely check stove status.

---

## 7. Success Metrics

### MVP Success Metrics

1. User can create an account and household automatically.
2. User can pair a device using NFC URL.
3. ESP32 CAM can connect to WiFi and MQTT broker.
4. PWA shows device online/offline status.
5. PWA can turn stove simulation LED on/off.
6. Absence detection correctly triggers warning and shutoff.
7. User can set and cancel a timer.
8. Voice command can trigger a stove action through backend and MQTT.
9. Stove events are recorded in SQLite.
10. Household role permissions work correctly.

### Demo Success Metrics

1. NFC tap opens pairing page on iPhone Safari.
2. User can pair device within 30 seconds.
3. Walking away from the sensor triggers buzzer and automatic LED shutoff.
4. Voice command such as “turn off the stove” successfully turns off the LED.
5. Camera stream is accessible from the PWA.
6. Event history updates after actions.

---

## 8. Product Scope

## 8.1 MVP Scope

The MVP includes:

- User signup/login
- Automatic household creation on signup
- Household membership model
- Device pairing through NFC
- Device dashboard
- Stove on/off simulation through LED
- Presence detection through ultrasonic sensor
- Warning buzzer before shutoff
- Configurable absence timeout
- Configurable warning delay
- Timer creation and cancellation
- MQTT communication between backend and ESP32 CAM
- Voice command pipeline
- Event logging
- Basic camera stream display
- Role-based permissions

## 8.2 Future Scope

Potential future versions may include:

- Production stove relay integration
- Certified electrical shutoff module
- Supabase production database
- Push notifications
- Multi-household support
- Invite links for household joining
- Cloud-hosted backend
- Advanced occupancy detection
- Mobile-native app
- Integration with Alexa, Google Home, or Siri Shortcuts
- Energy usage monitoring
- Smoke detector integration
- Automatic emergency contact alerts

---

# 9. User Stories

## 9.1 Authentication

### US-001: User Signup

As a new user, I want to create an account so that I can pair and manage Hestia devices.

**Acceptance Criteria**

- User can sign up with name, email, and password.
- Supabase Auth creates the user session.
- Backend creates a corresponding local user record.
- A household is automatically created named `[Name]'s Home`.
- User becomes owner of the household.
- User is redirected to the dashboard after signup.

---

### US-002: User Login

As a returning user, I want to log in so that I can access my household and devices.

**Acceptance Criteria**

- User can log in with email and password.
- JWT session token is stored in cookies for cross-context compatibility.
- User remains logged in when redirected from NFC pairing URL.
- Invalid login shows clear error messaging.

---

### US-003: Logout

As a user, I want to log out so that others cannot control my stove from my device.

**Acceptance Criteria**

- User can log out from the PWA.
- Session cookies are cleared.
- User is redirected to login page.
- Protected pages require login after logout.

---

# 10. Household Requirements

## 10.1 Household Creation

When a user signs up, the system automatically creates a household.

### Data Created

- User record
- Household record
- HouseholdMember record with role = `owner`

### Naming Rule

Default household name:

`[Name]'s Home`

Example:

`Isabella's Home`

---

## 10.2 Household Permissions

### Owner Permissions

Owners can:

- Add stoves
- Set timers
- Turn off stoves
- Turn on stove simulation
- Edit device settings
- Remove stoves
- Remove members
- Rename household
- Delete household
- Rename devices

### Member Permissions

Members can:

- Add stoves
- Set timers
- Cancel timers
- Turn off stoves
- Turn on stove simulation
- View stove status
- View event history
- View camera stream
- Edit safety settings, if allowed by MVP policy

Members cannot:

- Remove stoves
- Remove household members
- Rename household
- Delete household

---

## 10.3 Household Join Through Paired Device

If a user scans an NFC tag for a device already paired to a household, they may request to join that household.

For MVP simplicity, scanning a paired device while logged in adds the user directly as a household member.

Future versions may require owner approval.

---

# 11. Device Requirements

## 11.1 Device Ownership Model

Devices belong to households, not individual users.

### Requirement

Each device must have exactly one `household_id` once paired.

### Unpaired Device

Before pairing:

- `household_id = null`
- `paired_at = null`
- Device exists in backend registry with:
  - `device_id`
  - `nfc_token`
  - default settings

---

## 11.2 Device States

A device can have the following states:

### Unpaired

- Device exists in system.
- NFC token is valid.
- Not linked to a household.

### Paired

- Device linked to household.
- Household members can control it.

### Online

- Device has recently sent heartbeat.
- `last_seen_at` is within online threshold.

### Offline

- Device has not sent heartbeat recently.
- PWA should show offline warning.

### Stove On

- LED is on.
- System considers stove active.

### Stove Off

- LED is off.
- System considers stove inactive.

### Warning

- Absence timer expired.
- Buzzer is active.
- Shutoff countdown is running.

### Auto-Shutoff

- Warning delay has expired.
- System turns stove off.
- Event is logged.

---

# 12. NFC Pairing Flow

## 12.1 NFC Tag Format

Each physical Hestia device ships with a passive NFC sticker tag.

### NFC Hardware

- Passive NTAG213 sticker
- No battery
- iPhone reads tag at system level
- Tag opens URL in Safari

### Encoded URL Format

`https://stoveguard.app/pair?device_id=abc123&token=secret_xyz`

### URL Parameters

| Parameter | Description |
|---|---|
| `device_id` | Unique hardware device ID |
| `token` | Secret pairing token stored in backend |

---

## 12.2 Pairing Page States

### State 1: Device Unpaired + User Logged In

Display:

**“Add this stove to your household?”**

Actions:

- Add Stove
- Cancel

Backend behavior:

- Verify device exists.
- Verify token matches.
- Verify device is not already paired.
- Link device to user’s household.
- Set `paired_at`.
- Create default device settings if missing.
- Log event: `device_paired`.

---

### State 2: Device Already Paired + User Logged In

Display:

**“Join [Household Name]?”**

Actions:

- Join Household
- Cancel

Backend behavior:

- Verify token matches.
- Find household linked to device.
- Add user as household member with role `member`.
- Do not duplicate membership if user is already a member.
- Redirect to household dashboard.
- Log event: `household_member_joined`.

---

### State 3: Device Already Paired + User Not Logged In

Display:

**“Log in or sign up to join [Household Name].”**

Actions:

- Log In
- Sign Up

Behavior:

- Store pairing URL in return parameter.
- After login/signup, redirect back to pairing page.
- Then show the join household state.

---

### State 4: Device Unpaired + User Not Logged In

Display:

**“Log in or sign up to add this stove.”**

Actions:

- Log In
- Sign Up

Behavior:

- Store pairing URL in return parameter.
- After login/signup, redirect back to pairing page.
- Then show add stove state.

---

## 12.3 Pairing Security Requirements

1. Pairing requires both `device_id` and `token`.
2. Backend must verify token before showing household details.
3. Token should not be guessable.
4. Token should be stored securely.
5. Pairing endpoint must not allow changing another household’s device without permission.
6. Removing a device requires owner role.
7. A paired device cannot be paired to another household unless removed by an owner.

---

# 13. PWA Requirements

## 13.1 PWA Installation

The PWA must be installable from Safari on iPhone.

### Requirements

- Valid web app manifest
- Responsive mobile-first UI
- Works in Safari
- Add-to-Home-Screen compatible
- Cookie-based session works in Safari and PWA context
- App shell loads quickly on local network

---

## 13.2 Main Navigation

The PWA should include:

1. Dashboard
2. Devices
3. Device Detail
4. Pair Device
5. Household Settings
6. Event History
7. Login
8. Signup

---

## 13.3 Dashboard

The dashboard shows all devices in the user’s household.

### Device Card Fields

Each device card should show:

- Device name
- Online/offline status
- Stove state: On / Off / Warning
- Last seen time
- Active timer, if any
- Quick action: Turn Off
- Quick action: View Camera
- Quick action: Settings

---

## 13.4 Device Detail Page

The device detail page should show:

- Device name
- Online/offline state
- Stove state
- Current distance sensor status
- Absence timeout setting
- Warning delay setting
- Timer controls
- Manual on/off controls
- Camera stream
- Recent events

---

## 13.5 Timer Controls

Users can set a timer to turn off the stove.

### Timer Options

- 1 minute
- 5 minutes
- 10 minutes
- 15 minutes
- Custom time

### Acceptance Criteria

- User can create timer.
- User can cancel timer.
- Active timer displays countdown.
- When timer ends, backend sends stove off command through MQTT.
- Event is logged as `timer_shutoff`.
- Timer persists if frontend refreshes.
- Timer does not depend only on frontend JavaScript.

---

## 13.6 Manual Control

Users can manually turn stove simulation on/off from the PWA.

### Actions

- Turn On
- Turn Off

### Acceptance Criteria

- Clicking Turn On sends command to backend.
- Backend publishes MQTT command to ESP32 CAM.
- ESP32 CAM turns LED on.
- Stove state updates in backend.
- Event is logged with `triggered_by = user`.

---

## 13.7 Safety Settings

Users can configure:

| Setting | Description | Example |
|---|---|---|
| `absence_timeout` | Time without detecting a person before warning starts | 30 seconds |
| `warning_delay` | Time buzzer sounds before shutoff | 10 seconds |

### Acceptance Criteria

- User can edit settings from device detail page.
- Values are validated.
- Settings are stored in SQLite.
- Backend sends updated settings to ESP32 CAM through MQTT.
- Device uses latest settings for safety behavior.

### Suggested MVP Validation

| Setting | Minimum | Maximum |
|---|---:|---:|
| Absence timeout | 5 seconds | 30 minutes |
| Warning delay | 3 seconds | 2 minutes |

---

# 14. Hardware Requirements

## 14.1 ESP32 CAM Responsibilities

The ESP32 CAM handles:

- WiFi connection
- MQTT client connection
- Ultrasonic distance sensor reading
- LED control
- Grove Buzzer control
- Camera HTTP stream
- Heartbeat messages
- Stove state simulation
- Local safety logic fallback

---

## 14.2 Ultrasonic Distance Sensor

The ultrasonic sensor detects whether a person is near the stove.

### Presence Logic

A person is considered present if measured distance is below configured threshold.

Suggested demo threshold:

`distance <= 100 cm`

### Absence Logic

A person is considered absent if no valid presence detection occurs for `absence_timeout`.

### Requirements

- Sensor reads distance continuously.
- Sensor readings are smoothed to avoid false triggers.
- Invalid readings are ignored.
- The ESP32 CAM reports presence state to backend.
- The backend displays presence state in PWA.

---

## 14.3 LED Stove Simulation

The LED simulates the stove power state.

| LED State | Meaning |
|---|---|
| On | Stove is on |
| Off | Stove is off |
| Blinking | Warning state |

### Requirements

- MQTT command `stove/on` turns LED on.
- MQTT command `stove/off` turns LED off.
- Warning state may blink LED.
- LED state is reported to backend.

---

## 14.4 Grove Buzzer

The buzzer provides an audible warning before automatic shutoff.

### Requirements

- Buzzer turns on when absence timeout is reached.
- Buzzer remains active during warning delay.
- Buzzer stops when:
  - Person returns
  - Stove is manually turned off
  - Auto shutoff completes
- Buzzer event is logged.

---

## 14.5 ESP32 CAM Camera Stream

The ESP32 CAM exposes an HTTP stream.

### URL Format

`http://[device-ip]/stream`

### PWA Behavior

- Device detail page embeds camera stream.
- If stream fails, show “Camera unavailable.”
- Stream URL should be stored or discovered per device.
- For MVP local network demo, stream may be accessed directly by IP.

### Future Consideration

In production, direct local IP streaming may not work outside the home network. A secure relay or WebRTC gateway may be required.

---

## 14.6 Raspberry Pi 4B Responsibilities

The Raspberry Pi acts as the master server.

It runs:

- FastAPI backend
- SQLite database
- Mosquitto MQTT broker
- Whisper speech-to-text
- Voice command orchestrator
- Claude API tool-calling bridge
- ElevenLabs TTS response system

---

# 15. Safety Logic

## 15.1 Normal Operation Flow

1. Stove is turned on.
2. ESP32 CAM turns LED on.
3. Ultrasonic sensor checks for nearby person.
4. If person is detected, continue normal operation.
5. If person is not detected, start absence timer.
6. If absence reaches `absence_timeout`, enter warning state.
7. Buzzer sounds.
8. LED may blink.
9. If person returns during warning delay, cancel warning.
10. If warning delay expires, turn stove off.
11. Log event.

---

## 15.2 Safety State Machine

### States

1. `OFF`
2. `ON_PERSON_PRESENT`
3. `ON_PERSON_ABSENT`
4. `WARNING`
5. `AUTO_SHUTOFF`

### Transitions

| Current State | Condition | Next State |
|---|---|---|
| OFF | Stove turned on | ON_PERSON_PRESENT or ON_PERSON_ABSENT |
| ON_PERSON_PRESENT | Person absent | ON_PERSON_ABSENT |
| ON_PERSON_ABSENT | Person returns | ON_PERSON_PRESENT |
| ON_PERSON_ABSENT | Absence timeout reached | WARNING |
| WARNING | Person returns | ON_PERSON_PRESENT |
| WARNING | User turns stove off | OFF |
| WARNING | Warning delay expires | AUTO_SHUTOFF |
| AUTO_SHUTOFF | Stove off command complete | OFF |

---

## 15.3 Local Safety Fallback

The ESP32 CAM should be able to shut off the stove simulation locally even if backend or MQTT temporarily fails.

### Requirement

If stove is on and no person is detected for the configured timeout, ESP32 CAM should trigger buzzer and shut off LED locally.

### Rationale

Safety should not depend entirely on network availability.

---

# 16. Voice Control Requirements

## 16.1 Voice Pipeline

### Input Pipeline

1. User speaks near Logitech Webcam microphone.
2. Raspberry Pi captures audio.
3. Whisper converts speech to text.
4. Text is sent to Claude API using `claude-sonnet-4-6`.
5. Claude interprets command using tool calling.
6. Claude calls backend webhook.
7. Backend validates user/device/action.
8. Backend publishes MQTT command.
9. ESP32 CAM performs action.
10. ElevenLabs generates spoken response.

---

## 16.2 Supported Voice Commands

### MVP Commands

| User Says | Intended Action |
|---|---|
| “Turn off the stove.” | Turn off active stove |
| “Turn on the stove.” | Turn on stove simulation |
| “Set a timer for five minutes.” | Create stove shutoff timer |
| “Cancel the timer.” | Cancel active timer |
| “Is the stove on?” | Report stove state |
| “Show stove status.” | Report stove state, presence, timer |
| “Stop the alarm.” | Stop buzzer if safe |
| “How much time is left?” | Report timer countdown |

---

## 16.3 Voice Authentication Assumption

For MVP, voice control is assumed to run inside the home on the Raspberry Pi and acts on the default household/device.

### MVP Constraint

Voice commands do not perform speaker identification.

### Future Requirement

Production should include one or more of:

- Voice profile recognition
- PIN confirmation for risky actions
- App-based authorization
- Household-level voice permission settings

---

## 16.4 Voice Command Safety Rules

1. “Turn off” commands should always be allowed for household safety.
2. “Turn on” commands should be allowed only if system is configured to permit remote turn-on.
3. If multiple stoves exist, the system should ask which stove.
4. If command is ambiguous, TTS should ask for clarification.
5. If device is offline, TTS should say the stove device is offline.
6. If timer creation fails, TTS should explain the error.

---

## 16.5 Voice Response Examples

### Successful Shutoff

“Okay, I turned off the kitchen stove.”

### Timer Set

“Timer set for five minutes. I’ll turn off the stove when it ends.”

### Ambiguous Device

“I found two stoves. Which one do you want to control: kitchen stove or basement stove?”

### Offline Device

“I can’t reach the stove right now because the device is offline.”

---

# 17. Backend Requirements

## 17.1 Backend Framework

The backend is built with **FastAPI** and runs on the Raspberry Pi.

Responsibilities:

- Auth session verification
- User and household management
- Device pairing
- Device control
- MQTT publishing
- MQTT event ingestion
- Timer orchestration
- Voice webhook handling
- Event logging
- Device status tracking

---

## 17.2 Authentication

Auth uses Supabase Auth.

### Requirements

- Frontend receives JWT session from Supabase.
- JWT is stored in cookies for compatibility between browser/PWA/NFC redirect contexts.
- FastAPI validates JWT on protected endpoints.
- Local user record maps to Supabase user ID.

---

## 17.3 API Authorization

Every protected endpoint must verify:

1. User is authenticated.
2. User belongs to household.
3. User has required role for action.
4. Device belongs to user’s household.

---

## 17.4 MQTT Integration

Backend communicates with ESP32 CAM through Mosquitto.

### MQTT Topics

Suggested topic structure:

```text
stoveguard/devices/{device_id}/command
stoveguard/devices/{device_id}/state
stoveguard/devices/{device_id}/heartbeat
stoveguard/devices/{device_id}/settings
stoveguard/devices/{device_id}/events
```

---

## 17.5 MQTT Command Payloads

### Turn Stove On

```json
{
  "command": "STOVE_ON",
  "request_id": "uuid",
  "triggered_by": "user",
  "user_id": "user_123",
  "timestamp": "2026-06-12T17:00:00Z"
}
```

### Turn Stove Off

```json
{
  "command": "STOVE_OFF",
  "request_id": "uuid",
  "triggered_by": "user",
  "user_id": "user_123",
  "timestamp": "2026-06-12T17:00:00Z"
}
```

### Update Settings

```json
{
  "command": "UPDATE_SETTINGS",
  "absence_timeout": 30,
  "warning_delay": 10,
  "timestamp": "2026-06-12T17:00:00Z"
}
```

### Stop Buzzer

```json
{
  "command": "STOP_BUZZER",
  "request_id": "uuid",
  "timestamp": "2026-06-12T17:00:00Z"
}
```

---

## 17.6 MQTT State Payloads

```json
{
  "device_id": "abc123",
  "stove_state": "on",
  "presence_state": "present",
  "distance_cm": 72,
  "warning_active": false,
  "buzzer_active": false,
  "ip_address": "192.168.1.50",
  "timestamp": "2026-06-12T17:00:00Z"
}
```

---

# 18. API Requirements

## 18.1 Auth APIs

### POST `/auth/sync-user`

Sync Supabase Auth user with local SQLite user table.

Request:

```json
{
  "supabase_user_id": "uuid",
  "email": "user@example.com",
  "name": "Isabella"
}
```

Behavior:

- If user does not exist, create user.
- Auto-create household.
- Add user as owner.
- Return household.

---

## 18.2 Household APIs

### GET `/households/me`

Returns the user’s household.

### PATCH `/households/{household_id}`

Owner only.

Allows:

- Rename household

### DELETE `/households/{household_id}`

Owner only.

Deletes household if allowed.

### GET `/households/{household_id}/members`

Returns household members.

### DELETE `/households/{household_id}/members/{user_id}`

Owner only.

Removes member.

---

## 18.3 Device APIs

### GET `/devices`

Returns all devices in user’s household.

### GET `/devices/{device_id}`

Returns device details.

### PATCH `/devices/{device_id}`

Allows updating device name or settings depending on role.

### DELETE `/devices/{device_id}`

Owner only.

Removes device from household.

---

## 18.4 Pairing APIs

### GET `/pair/lookup`

Query parameters:

- `device_id`
- `token`

Returns pairing state.

Response examples:

```json
{
  "state": "unpaired",
  "device_id": "abc123"
}
```

```json
{
  "state": "paired",
  "device_id": "abc123",
  "household_name": "Isabella's Home"
}
```

### POST `/pair/claim`

Requires logged-in user.

Request:

```json
{
  "device_id": "abc123",
  "token": "secret_xyz"
}
```

Behavior:

- If unpaired: link to user’s household.
- If paired: add user to household as member.
- Return household and device.

---

## 18.5 Stove Control APIs

### POST `/devices/{device_id}/turn-on`

Turns stove simulation on.

### POST `/devices/{device_id}/turn-off`

Turns stove simulation off.

### POST `/devices/{device_id}/stop-buzzer`

Stops buzzer if allowed.

### POST `/devices/{device_id}/settings`

Updates safety settings.

---

## 18.6 Timer APIs

### POST `/devices/{device_id}/timers`

Creates shutoff timer.

Request:

```json
{
  "duration_seconds": 300
}
```

### GET `/devices/{device_id}/timers/active`

Returns active timer.

### DELETE `/devices/{device_id}/timers/active`

Cancels active timer.

---

## 18.7 Event APIs

### GET `/devices/{device_id}/events`

Returns stove event history.

### POST `/internal/devices/{device_id}/events`

Used by device or MQTT bridge to record hardware events.

---

## 18.8 Voice Webhook API

### POST `/voice/webhook`

Called by Claude tool-calling bridge.

Request:

```json
{
  "intent": "turn_off_stove",
  "device_name": "kitchen stove",
  "user_context": {
    "household_id": "household_123"
  }
}
```

Response:

```json
{
  "success": true,
  "message": "The kitchen stove has been turned off."
}
```

---

# 19. Data Model

## 19.1 User

```text
User
- id
- email
- password_hash
- name
```

### Notes

Because Supabase Auth manages authentication, `password_hash` may be unused locally in MVP. The local user table should store Supabase user ID or use `id` as Supabase user ID.

Recommended adjustment:

```text
User
- id
- supabase_user_id
- email
- name
- created_at
```

---

## 19.2 Household

```text
Household
- id
- name
- owner_id
```

### Requirements

- `owner_id` references User.
- Household is created automatically on signup.
- Household name can be changed only by owner.

---

## 19.3 HouseholdMember

```text
HouseholdMember
- household_id
- user_id
- role
```

### Role Values

```text
owner
member
```

### Constraints

- Composite unique key: `(household_id, user_id)`
- User must not be added twice to same household.
- Owner must always be member of own household.

---

## 19.4 Device

```text
Device
- id
- household_id
- nfc_token
- name
- paired_at
- last_seen_at
- is_online
```

### Requirements

- `id` maps to physical device ID.
- `nfc_token` verifies pairing.
- `household_id` is nullable before pairing.
- `is_online` can be computed from `last_seen_at`, but may also be cached.

Recommended additional fields:

```text
- stove_state
- presence_state
- ip_address
- stream_url
- firmware_version
- created_at
```

---

## 19.5 DeviceSettings

```text
DeviceSettings
- device_id
- absence_timeout
- warning_delay
```

### Requirements

- One settings row per device.
- Settings created with defaults when device is registered or paired.

Recommended defaults:

```text
absence_timeout = 30 seconds
warning_delay = 10 seconds
```

---

## 19.6 StoveEvent

```text
StoveEvent
- id
- device_id
- event_type
- triggered_by
- user_id
- timestamp
```

### Event Types

```text
device_paired
device_unpaired
stove_on
stove_off
manual_shutoff
timer_started
timer_cancelled
timer_shutoff
absence_detected
warning_started
warning_cancelled
auto_shutoff
buzzer_started
buzzer_stopped
settings_updated
device_online
device_offline
voice_command_received
voice_command_completed
voice_command_failed
```

### Triggered By Values

```text
user
sensor
timer
voice
system
device
```

---

## 19.7 Recommended Timer Table

The provided data model does not include timers, but timer functionality requires persistence.

Add:

```text
StoveTimer
- id
- device_id
- user_id
- duration_seconds
- started_at
- expires_at
- status
- created_at
```

### Timer Status Values

```text
active
cancelled
completed
failed
```

---

# 20. Frontend Page Requirements

## 20.1 Login Page

Fields:

- Email
- Password

Actions:

- Log in
- Go to signup

Error states:

- Invalid credentials
- Network error
- Session expired

---

## 20.2 Signup Page

Fields:

- Name
- Email
- Password
- Confirm password

Actions:

- Create account

Backend behavior:

- Supabase Auth signup
- Local user sync
- Auto-create household

---

## 20.3 Pairing Page

Reads:

- `device_id`
- `token`

Calls:

- `/pair/lookup`
- `/pair/claim`

States:

1. Loading
2. Invalid NFC link
3. Device unpaired, logged in
4. Device unpaired, logged out
5. Device paired, logged in
6. Device paired, logged out
7. Pairing success
8. Pairing failure

---

## 20.4 Dashboard Page

Displays:

- Household name
- Device cards
- Add stove instruction
- Household members summary

Empty state:

“Tap the NFC sticker on your Hestia device to add your first stove.”

---

## 20.5 Device Detail Page

Displays:

- Device status
- Stove state
- Presence status
- Distance reading
- Camera stream
- Timer controls
- Manual controls
- Settings
- Recent events

---

## 20.6 Household Settings Page

Owner view:

- Rename household
- View members
- Remove members
- Delete household

Member view:

- View household name
- View members
- Leave household, optional future feature

---

# 21. UI/UX Requirements

## 21.1 Design Principles

1. Safety-first
2. Simple actions
3. Clear status
4. Large buttons for urgent actions
5. Mobile-first
6. Low friction pairing

---

## 21.2 Status Language

Use direct labels:

- Stove On
- Stove Off
- Warning
- Auto Shutoff
- Device Offline
- Person Detected
- No Person Detected

Avoid technical terms like MQTT, token, or ultrasonic sensor in user-facing UI unless in debug mode.

---

## 21.3 Critical Action Styling

The “Turn Off Stove” button should be the most prominent action.

The “Turn On Stove” button should be less prominent and may require confirmation.

---

## 21.4 Warning State UI

When warning is active:

Display:

**“No one detected near the stove. Stove will turn off in X seconds.”**

Actions:

- I’m here
- Turn off now

---

# 22. System Architecture

## 22.1 High-Level Architecture

```text
React PWA
   |
   | HTTPS / Local HTTP API
   v
FastAPI Backend on Raspberry Pi
   |
   | SQLite
   v
Local Database

FastAPI Backend
   |
   | MQTT publish/subscribe
   v
Mosquitto Broker on Raspberry Pi
   |
   v
ESP32 CAM Device
   |
   | Sensors / LED / Buzzer / Camera Stream
   v
Physical Hestia Demo Hardware
```

---

## 22.2 Voice Architecture

```text
Logitech Webcam Mic
   |
   v
Whisper STT on Raspberry Pi
   |
   v
Claude API with Tool Calling
   |
   v
Backend Voice Webhook
   |
   v
MQTT Command
   |
   v
ESP32 CAM
   |
   v
ElevenLabs TTS Response
```

---

# 23. Security Requirements

## 23.1 Authentication Security

- Use Supabase Auth for account creation and login.
- Store JWT session in secure cookies where possible.
- Backend validates token on every protected request.
- Reject expired or invalid tokens.

---

## 23.2 Authorization Security

- Users can only access devices in their household.
- Only owners can remove stoves.
- Only owners can remove members.
- Only owners can rename/delete household.
- Device control requires household membership.

---

## 23.3 NFC Security

- NFC URL must include secret token.
- Device ID alone is not enough to pair.
- Token should be random and difficult to guess.
- Backend must verify token before revealing household name.
- Token should be rotated if device is reset.

---

## 23.4 MQTT Security

MVP local demo may run MQTT on local network.

Production should include:

- MQTT username/password
- TLS
- Per-device credentials
- Topic-level authorization
- Replay protection using request IDs

---

## 23.5 Voice Security

MVP voice system assumes trusted household environment.

Risks:

- Anyone nearby may issue commands.
- Voice spoofing is possible.
- No speaker identification.

Mitigations:

- Always allow shutoff.
- Consider requiring app confirmation for turn-on.
- Log all voice commands.
- Add future voice PIN for dangerous actions.

---

# 24. Privacy Requirements

## 24.1 Camera Privacy

The camera stream should be treated as sensitive.

MVP requirements:

- Camera stream only accessible on local network.
- PWA should show when camera stream is active.
- Do not record camera footage.
- Do not upload camera stream to cloud.

Future production requirements:

- Authenticated stream access
- Encrypted transport
- User-controlled camera disable option

---

## 24.2 Voice Privacy

MVP voice pipeline sends interpreted text to Claude API and uses ElevenLabs for TTS.

Requirements:

- Do not store raw audio unless explicitly enabled for debugging.
- Store only command transcript and result if needed.
- Make clear that voice processing may use external APIs.

---

# 25. Reliability Requirements

## 25.1 Device Heartbeat

ESP32 CAM sends heartbeat every 10 seconds.

Backend updates:

- `last_seen_at`
- `is_online`

Device considered offline if no heartbeat for 30 seconds.

---

## 25.2 Offline Behavior

If device is offline:

- PWA should disable manual controls.
- PWA should show offline warning.
- Backend should reject control commands or queue them only if safe.
- Local ESP32 safety fallback should continue if device hardware is powered.

---

## 25.3 Backend Restart Behavior

After Raspberry Pi backend restarts:

- SQLite data persists.
- Active timers should be restored.
- Device online state should be recalculated.
- MQTT subscriptions should reconnect.

---

## 25.4 Timer Reliability

Timers must run on backend, not only frontend.

If backend restarts:

- Expired timers should immediately trigger shutoff when service resumes.
- Active timers should continue based on `expires_at`.

---

# 26. Performance Requirements

| Area | Requirement |
|---|---|
| Dashboard load | Under 2 seconds on local network |
| MQTT command latency | Under 1 second on local network |
| Voice command response | Under 8 seconds MVP target |
| NFC page load | Under 3 seconds |
| Device heartbeat interval | 10 seconds |
| Offline detection | Within 30 seconds |

---

# 27. Error Handling

## 27.1 Pairing Errors

| Error | User Message |
|---|---|
| Invalid token | “This pairing link is invalid.” |
| Device not found | “This Hestia device was not found.” |
| Already member | “You are already part of this household.” |
| Not logged in | “Please log in or sign up to continue.” |
| Server unavailable | “Unable to pair right now. Please try again.” |

---

## 27.2 Device Control Errors

| Error | User Message |
|---|---|
| Device offline | “This stove device is offline.” |
| Unauthorized | “You do not have permission to control this stove.” |
| MQTT failure | “Command could not be sent.” |
| Invalid state | “This action is not available right now.” |

---

## 27.3 Voice Errors

| Error | TTS Response |
|---|---|
| Unrecognized command | “Sorry, I didn’t understand that command.” |
| Multiple devices | “Which stove do you mean?” |
| Device offline | “The stove device is offline.” |
| Backend failure | “I couldn’t complete that action.” |

---

# 28. Event Logging Requirements

Every important stove action should create a `StoveEvent`.

## Events to Log

- Device paired
- Device unpaired
- Stove turned on
- Stove turned off
- Timer started
- Timer cancelled
- Timer completed
- Absence detected
- Warning started
- Warning cancelled
- Auto shutoff
- Settings changed
- Voice command received
- Voice command completed
- Voice command failed
- Device online
- Device offline

## Event Display

The PWA should show recent events with:

- Event type
- Device name
- Trigger source
- User name, if applicable
- Timestamp

Example:

“Kitchen Stove was turned off by Isabella at 5:42 PM.”

---

# 29. Admin / Developer Tools

For MVP/demo, include a simple developer page or debug panel.

## Debug Panel

Displays:

- Device ID
- MQTT connection status
- Last heartbeat
- Last distance reading
- Current IP address
- Camera stream URL
- Last received MQTT message
- Firmware version

## Debug Actions

- Simulate stove on
- Simulate stove off
- Simulate absence
- Clear warning
- Send test buzzer command

---

# 30. Firmware Requirements

## 30.1 ESP32 CAM Firmware Setup

Firmware must support:

- WiFi SSID/password configuration
- MQTT broker IP configuration
- Device ID configuration
- Sensor pin configuration
- LED pin configuration
- Buzzer pin configuration
- Camera stream server

---

## 30.2 Firmware Main Loop

The ESP32 CAM should:

1. Maintain WiFi connection.
2. Maintain MQTT connection.
3. Read ultrasonic sensor.
4. Calculate presence state.
5. Apply local safety state machine.
6. Listen for MQTT commands.
7. Update LED and buzzer.
8. Publish state changes.
9. Send periodic heartbeat.
10. Serve camera stream.

---

## 30.3 Firmware MQTT Commands

The ESP32 CAM must handle:

- `STOVE_ON`
- `STOVE_OFF`
- `STOP_BUZZER`
- `UPDATE_SETTINGS`
- `PING`
- `RESET_STATE`

---

## 30.4 Firmware State Publishing

The ESP32 CAM should publish state when:

- Stove state changes
- Presence state changes
- Warning starts
- Warning cancels
- Auto shutoff occurs
- Settings update succeeds
- Buzzer state changes

---

# 31. Database Schema Draft

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    supabase_user_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE household_members (
    household_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TEXT NOT NULL,
    PRIMARY KEY (household_id, user_id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    household_id TEXT,
    nfc_token TEXT NOT NULL,
    name TEXT,
    paired_at TEXT,
    last_seen_at TEXT,
    is_online INTEGER DEFAULT 0,
    stove_state TEXT DEFAULT 'off',
    presence_state TEXT DEFAULT 'unknown',
    ip_address TEXT,
    stream_url TEXT,
    firmware_version TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE device_settings (
    device_id TEXT PRIMARY KEY,
    absence_timeout INTEGER NOT NULL DEFAULT 30,
    warning_delay INTEGER NOT NULL DEFAULT 10,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE stove_events (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    triggered_by TEXT NOT NULL,
    user_id TEXT,
    timestamp TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE stove_timers (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'completed', 'failed')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

# 32. MVP Milestones

## Milestone 1: Core Backend and Database

Deliverables:

- FastAPI app
- SQLite schema
- Supabase Auth JWT validation
- User sync
- Household creation
- Role-based access checks

---

## Milestone 2: Device Pairing

Deliverables:

- Device registry
- NFC URL parsing
- Pair lookup endpoint
- Pair claim endpoint
- Pairing page in React
- Household join logic

---

## Milestone 3: MQTT and ESP32 Control

Deliverables:

- Mosquitto broker setup
- Backend MQTT publisher/subscriber
- ESP32 MQTT client
- LED on/off commands
- Heartbeat publishing
- Device online/offline tracking

---

## Milestone 4: Safety Automation

Deliverables:

- Ultrasonic sensor integration
- Presence detection
- Absence timer
- Warning buzzer
- Auto shutoff
- Event logging
- Local fallback logic

---

## Milestone 5: PWA Dashboard

Deliverables:

- Mobile-first React UI
- Device list
- Device detail
- Timer controls
- Settings controls
- Event history
- Camera stream embed

---

## Milestone 6: Voice Control

Deliverables:

- Logitech Webcam mic input
- Whisper STT
- Claude tool calling
- Backend voice webhook
- MQTT action execution
- ElevenLabs TTS response

---

## Milestone 7: Demo Polish

Deliverables:

- Stable demo script
- Debug panel
- Clear error states
- Seed device data
- NFC stickers programmed
- End-to-end testing

---

# 33. Launch Criteria

The MVP is considered complete when:

1. A new user can sign up.
2. A household is automatically created.
3. User can scan NFC sticker and pair a device.
4. Device appears on dashboard.
5. Device online status updates.
6. User can turn LED on/off from PWA.
7. Ultrasonic sensor detects absence.
8. Buzzer warns before shutoff.
9. LED automatically turns off after absence timeout and warning delay.
10. User can set a timer.
11. Timer can turn off stove simulation.
12. Voice command can turn off stove simulation.
13. Event history records all major actions.
14. Owner/member permissions are enforced.
15. Camera stream appears on device page.
16. System can complete a full live demo without manual backend intervention.

---

# 34. Demo Script

## Scenario: First-Time Setup

1. Open iPhone.
2. Tap NFC sticker on Hestia device.
3. Safari opens pairing URL.
4. User logs in or signs up.
5. Pairing page says “Add this stove to your household?”
6. User taps “Add Stove.”
7. Dashboard shows “Kitchen Stove.”

---

## Scenario: Manual Control

1. User opens dashboard.
2. User taps Kitchen Stove.
3. User taps “Turn On.”
4. LED turns on.
5. Event history shows stove turned on.

---

## Scenario: Absence Auto-Shutoff

1. User stands near sensor.
2. Stove remains on.
3. User walks away.
4. After absence timeout, buzzer sounds.
5. LED blinks.
6. After warning delay, LED turns off.
7. Event history shows auto shutoff.

---

## Scenario: Timer Control

1. User turns stove on.
2. User sets 1-minute timer.
3. Timer countdown appears.
4. Timer expires.
5. LED turns off.
6. Event history shows timer shutoff.

---

## Scenario: Voice Control

1. User says, “Turn off the stove.”
2. Whisper transcribes command.
3. Claude interprets intent.
4. Backend sends MQTT command.
5. LED turns off.
6. ElevenLabs says, “Okay, I turned off the kitchen stove.”

---

# 35. Risks and Mitigations

## Risk 1: Ultrasonic Sensor False Negatives

A person may be present but not detected due to angle, clothing, distance, or obstruction.

### Mitigation

- Smooth readings.
- Use conservative timeout.
- Use warning delay before shutoff.
- Allow user to cancel warning.
- Future: add PIR or camera-based presence detection.

---

## Risk 2: Network Failure

MQTT or WiFi may fail.

### Mitigation

- ESP32 local fallback safety logic.
- Heartbeat monitoring.
- Offline UI state.
- Reconnect logic.

---

## Risk 3: NFC Link Sharing

Someone could share the NFC URL.

### Mitigation

- Require login.
- Use secret token.
- Owner controls removal.
- Future: token rotation and owner approval.

---

## Risk 4: Voice Misinterpretation

Voice system may misunderstand commands.

### Mitigation

- Allow shutoff freely.
- Confirm risky actions.
- Ask clarifying questions for ambiguity.
- Log voice transcripts.

---

## Risk 5: Camera Privacy

Camera stream could expose private kitchen video.

### Mitigation

- Local-only stream for MVP.
- No recording.
- Clear camera indicator in UI.
- Future authenticated stream relay.

---

## Risk 6: Real Stove Safety Certification

Actual stove shutoff involves electrical safety and certification.

### Mitigation

- MVP uses LED simulation only.
- Clearly label demo as simulation.
- Future versions require certified relay hardware and compliance testing.

---

# 36. Open Questions

1. Should members be allowed to edit safety settings, or only owners?
2. Should joining a household through a paired device require owner approval?
3. Should remote “Turn On” be allowed, or only local/manual turn-on?
4. Should the camera stream be visible to all members?
5. Should multiple active timers be allowed per device, or only one?
6. Should NFC token rotate after first pairing?
7. Should ESP32 store settings locally in non-volatile memory?
8. Should the PWA support push notifications for warning state?
9. Should voice commands require a wake word?
10. What is the default stove name after pairing?

---

# 37. Recommended MVP Decisions

For the first build, use these decisions:

1. Members can edit timers and turn off stove.
2. Only owners can remove devices or household members.
3. Members can add devices.
4. Only one active timer per stove.
5. Remote turn-on is allowed for demo but should require confirmation in UI.
6. Voice turn-off is allowed.
7. Voice turn-on should require confirmation or be disabled.
8. Joining household through paired NFC tag automatically adds user as member.
9. Camera stream is visible to all household members.
10. Default device name is “Kitchen Stove.”

---

# 38. Technical Implementation Notes

## React PWA

Use:

- React
- React Router
- Service worker
- Web app manifest
- Cookie-based auth session
- Mobile-first CSS

Key routes:

```text
/login
/signup
/dashboard
/devices/:deviceId
/pair
/household/settings
```

---

## FastAPI

Use:

- `uvicorn`
- `pydantic`
- `sqlite3` or SQLAlchemy
- Supabase JWT verification
- `paho-mqtt`
- Background task scheduler for timers
- Webhook endpoint for voice actions

---

## Raspberry Pi Services

Recommended services:

```text
stoveguard-api.service
mosquitto.service
stoveguard-voice.service
```

---

## MQTT Broker

Use Mosquitto locally.

Example broker address:

```text
mqtt://raspberrypi.local:1883
```

---

## ESP32 CAM

Recommended firmware modules:

- WiFi manager
- MQTT client
- Sensor reader
- Stove state machine
- Camera server
- Heartbeat publisher
- Command handler

---

# 39. Final MVP Definition

The Hestia MVP is a local-network smart stove safety demo where users can:

1. Create an account.
2. Automatically get a household.
3. Pair a physical ESP32 CAM device using an NFC sticker.
4. View and control the stove simulation through a React PWA.
5. Use an ultrasonic sensor to detect absence.
6. Hear a buzzer warning before automatic shutoff.
7. Set shutoff timers.
8. Use voice commands to control the stove.
9. View a camera stream.
10. See event history.
11. Share the stove with household members.

The MVP should clearly demonstrate the product’s core value:  
**Hestia helps prevent unattended stove danger by detecting absence, warning the user, and automatically shutting off the stove.**