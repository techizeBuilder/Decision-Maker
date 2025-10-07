# DM Calendar Disconnection Flag Flow

## Overview
When a Decision Maker (DM) disconnects their calendar after initially connecting it, the inviting sales rep receives a flag. This flag is applied each time a disconnect happens.

## Implementation Requirements

### 1. Calendar Disconnect Detection
- Track when a DM changes `calendarIntegrationEnabled` from `true` to `false`
- Monitor both direct disconnection and token removal/expiration

### 2. Flag Creation Logic
- When DM disconnects calendar:
  - Find the inviting sales rep (`invitedBy` field)
  - Create a flag record for the sales rep
  - Flag type: "dm_calendar_disconnect"
  - Flag reason: "Invited DM disconnected their calendar"

### 3. Flag Details
- **Type**: `dm_calendar_disconnect`
- **Status**: `pending` (requires review)
- **Reporter**: System (automatic flag)
- **Content**: Details about which DM disconnected and when
- **Priority**: Medium (impacts rep's ability to earn credits)

### 4. Credit Impact
- When DM disconnects calendar, rep loses credits for that DM
- Rep's call limits should be recalculated
- System should update rep's monthly call allowance

### 5. Endpoints to Implement
- Calendar disconnect endpoint
- Flag creation on disconnect
- Credit recalculation on disconnect

## Technical Implementation

### Database Changes
- Track calendar connection history
- Flag system integration
- Credit recalculation triggers

### API Endpoints
- `POST /api/calendar/disconnect` - Handle calendar disconnection
- Automatic flagging in existing calendar endpoints