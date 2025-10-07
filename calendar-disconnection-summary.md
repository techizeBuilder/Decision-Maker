# Calendar Disconnection Summary

## Problem
Need to implement a system where:
1. When a DM disconnects their calendar after initially connecting it
2. The inviting sales rep gets flagged
3. This flag is applied each time a disconnect happens
4. Rep loses credits for that DM when calendar is disconnected

## Current State Analysis
- Current logs show: "Connected calendar DMs=0" even though DM has calendar enabled
- This suggests the system isn't properly detecting calendar connections
- Need to fix the detection logic AND add disconnect flagging

## Implementation Plan
1. Add calendar disconnect endpoint
2. Implement automatic flagging when DM disconnects
3. Recalculate rep credits when DM disconnects
4. Track calendar connection state changes

## Expected Flow
1. DM signs up through rep invitation → calendar disconnected by default
2. DM connects calendar → rep gets credits
3. DM disconnects calendar → rep gets flagged AND loses credits for that DM
4. Each subsequent disconnect → new flag for the rep