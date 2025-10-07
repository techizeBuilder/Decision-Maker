import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Google Calendar configuration
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ;
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET ;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  `https://decisionmaker.shrawantravels.com/api/auth/google/callback`;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "Google Calendar integration disabled: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET",
  );
} else {
  console.log("Google Calendar integration enabled");
  console.log("Redirect URI:", GOOGLE_REDIRECT_URI);
}

// OAuth2 client setup
export const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
);

// Calendar API setup
export const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// Generate authorization URL
export function getAuthUrl(userId: string): string {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: userId, // Pass user ID to identify the user after OAuth
    prompt: "consent",
  });
}

// Set credentials from stored tokens
export function setCredentials(tokens: any) {
  oauth2Client.setCredentials(tokens);
  console.log("Google Calendar credentials set with tokens:", {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiryDate: tokens.expiry_date,
    isExpired: tokens.expiry_date
      ? new Date(tokens.expiry_date) < new Date()
      : false,
  });
}

// Refresh access token if expired
export async function refreshAccessToken(
  userId: string,
  storage: any,
): Promise<any> {
  try {
    const user = await storage.getUser(userId);
    if (!user?.googleCalendarTokens?.refresh_token) {
      throw new Error("No refresh token available");
    }

    // Set the refresh token
    oauth2Client.setCredentials({
      refresh_token: user.googleCalendarTokens.refresh_token,
    });

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update user's tokens in database
    const updatedTokens = {
      ...user.googleCalendarTokens,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
    };

    await storage.updateUser(userId, {
      googleCalendarTokens: updatedTokens,
    });

    // Set the new credentials
    oauth2Client.setCredentials(updatedTokens);

    console.log("Access token refreshed successfully for user:", userId);
    return updatedTokens;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}

// Get user's calendar events (overloaded function for backward compatibility)
export async function getCalendarEvents(
  userIdOrCalendarId: string,
  storageOrTimeMin?: any,
  timeMaxOrTimeMin?: string,
  userId?: string,
  storage?: any,
) {
  // Handle both old and new signatures
  let actualUserId: string;
  let actualStorage: any;
  let calendarId: string = "primary";

  if (typeof storageOrTimeMin === "object" && storageOrTimeMin.getUser) {
    // New signature: getCalendarEvents(userId, storage)
    actualUserId = userIdOrCalendarId;
    actualStorage = storageOrTimeMin;
  } else if (typeof userIdOrCalendarId === "string" && !storageOrTimeMin) {
    // Single parameter call - treat as calendarId for simple event listing
    calendarId = userIdOrCalendarId;
    // This will fail without proper context, but maintains backward compatibility
    throw new Error("Insufficient parameters for calendar event retrieval");
  } else {
    // Old signature: getCalendarEvents(calendarId, timeMin, timeMax, userId, storage)
    calendarId = userIdOrCalendarId;
    actualUserId = userId!;
    actualStorage = storage!;
  }

  return await getCalendarEventsInternal(
    actualUserId,
    actualStorage,
    calendarId,
  );
}

// Internal function that does the actual work
async function getCalendarEventsInternal(
  userId: string,
  storage: any,
  calendarId: string = "primary",
) {
  try {
    // Get user's tokens from storage
    const user = await storage.getUser(userId);
    if (!user?.googleCalendarTokens) {
      throw new Error("No Google Calendar tokens found for user");
    }

    // Check if token is expired and refresh if needed
    const isTokenExpired = user.googleCalendarTokens.expiry_date
      ? new Date(user.googleCalendarTokens.expiry_date) < new Date()
      : false;

    let tokens = user.googleCalendarTokens;

    if (isTokenExpired) {
      console.log("Token expired, refreshing...");
      tokens = await refreshAccessToken(userId, storage);
    }

    // Set credentials for this request
    oauth2Client.setCredentials(tokens);

    // Debug: Log token information
    console.log("Setting credentials with tokens:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      tokenType: tokens.token_type,
    });

    // Get upcoming events (next 30 days)
    const timeMin = new Date().toISOString();
    const timeMax = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    console.log("Fetching calendar events for user:", userId);
    console.log("Time range:", timeMin, "to", timeMax);

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    console.log(
      "Calendar events fetched successfully, count:",
      response.data.items?.length || 0,
    );
    return response.data.items || [];
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw error;
  }
}

// Create calendar event
export async function createCalendarEvent(eventData: {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: { email: string; displayName?: string }[];
  calendarId?: string;
}) {
  try {
    const response = await calendar.events.insert({
      calendarId: eventData.calendarId || "primary",
      sendUpdates: "all",
      requestBody: {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        attendees: eventData.attendees,
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
      conferenceDataVersion: 1,
    });

    return response.data;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw error;
  }
}

// Enhanced availability checking with all three conditions
export async function getAvailableSlots(
  userId: string,
  storage: any,
  startDate: string,
  endDate: string,
  duration: number = 30, // Duration in minutes
  salesRepId?: string, // Add sales rep ID for conflict checking
) {
  try {
    console.log('\n=== COMPREHENSIVE AVAILABILITY CHECK ===');
    console.log(`Checking availability for DM: ${userId}, Sales Rep: ${salesRepId || 'N/A'}`);
    console.log(`Date range: ${startDate} to ${endDate}, Duration: ${duration}min`);

    // CONDITION 1: Check DM database conflicts
    const dmDatabaseCalls = await storage.getCallsByDateRange(
      userId,
      startDate,
      endDate
    );

    // CONDITION 2: Check DM Google Calendar conflicts
    let dmCalendarBusyTimes = [];
    try {
      const events = await getCalendarEventsInternal(userId, storage, "primary");
      dmCalendarBusyTimes = events
        .filter((event) => event.start?.dateTime && event.end?.dateTime)
        .map((event) => ({
          start: new Date(event.start!.dateTime!),
          end: new Date(event.end!.dateTime!),
          source: 'dm_calendar',
          summary: event.summary || 'Calendar Event'
        }));
      console.log(`✓ DM Calendar: Found ${dmCalendarBusyTimes.length} events`);
    } catch (calendarError) {
      console.warn(`⚠ DM Calendar access failed:`, calendarError.message);
    }

    // CONDITION 3: Check Sales Rep database conflicts (if salesRepId provided)
    let salesRepDatabaseCalls = [];
    if (salesRepId) {
      try {
        salesRepDatabaseCalls = await storage.getCallsBySalesRepDateRange(
          salesRepId,
          startDate,
          endDate
        );
        console.log(`✓ Sales Rep Database: Found ${salesRepDatabaseCalls.length} calls`);
      } catch (error) {
        console.warn(`⚠ Sales Rep database check failed:`, error.message);
      }
    } else {
      console.log('! Sales Rep ID not provided - skipping rep conflict check');
    }

    // Convert all conflicts to busy times
    const dmDatabaseBusyTimes = dmDatabaseCalls
      .filter((call) => call.scheduledAt && call.endTime && call.status !== 'cancelled')
      .map((call) => ({
        start: new Date(call.scheduledAt),
        end: new Date(call.endTime),
        source: 'dm_database',
        callId: call._id,
        status: call.status
      }));

    const salesRepBusyTimes = salesRepDatabaseCalls
      .filter((call) => call.scheduledAt && call.endTime && call.status !== 'cancelled')
      .map((call) => ({
        start: new Date(call.scheduledAt),
        end: new Date(call.endTime),
        source: 'salesrep_database',
        callId: call._id,
        dmId: call.decisionMakerId
      }));

    // Combine ALL busy times from all three sources
    const allBusyTimes = [...dmCalendarBusyTimes, ...dmDatabaseBusyTimes, ...salesRepBusyTimes]
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    console.log('Conflict Summary:');
    console.log(`- DM Database: ${dmDatabaseBusyTimes.length} conflicts`);
    console.log(`- DM Calendar: ${dmCalendarBusyTimes.length} conflicts`);
    console.log(`- Sales Rep Database: ${salesRepBusyTimes.length} conflicts`);
    console.log(`- Total Conflicts: ${allBusyTimes.length}`);

    if (allBusyTimes.length > 0) {
      console.log('Conflict Details:');
      allBusyTimes.forEach(bt => {
        console.log(`  - ${bt.source}: ${bt.start.toISOString()} to ${bt.end.toISOString()}`);
      });
    }



    // Generate available slots
    const availableSlots = [];
    const workingHours = { start: 8, end: 18 }; // 8 AM to 6 PM (extended to catch all conflicts)
    const slotDuration = duration * 60 * 1000; // Convert to milliseconds

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (
      let day = new Date(start);
      day <= end;
      day.setDate(day.getDate() + 1)
    ) {
      // Skip weekends
      if (day.getDay() === 0 || day.getDay() === 6) continue;

      // Generate slots for the day
      const dayStart = new Date(day);
      dayStart.setHours(workingHours.start, 0, 0, 0);

      const dayEnd = new Date(day);
      dayEnd.setHours(workingHours.end, 0, 0, 0);

      for (
        let slotStart = new Date(dayStart);
        slotStart < dayEnd;
        slotStart.setTime(slotStart.getTime() + slotDuration)
      ) {
        const slotEnd = new Date(slotStart.getTime() + slotDuration);

        // Check if this slot conflicts with ANY busy time from ALL three sources
        const conflictingEvents = allBusyTimes.filter((busyTime: any) => {
          const hasOverlap = (
            (slotStart >= busyTime.start && slotStart < busyTime.end) ||
            (slotEnd > busyTime.start && slotEnd <= busyTime.end) ||
            (slotStart <= busyTime.start && slotEnd >= busyTime.end)
          );
          
          if (hasOverlap) {
            console.log(`🔍 OVERLAP DETECTED: Slot ${slotStart.toISOString()} conflicts with ${busyTime.source} ${busyTime.start.toISOString()}`);
          }
          
          return hasOverlap;
        });

        const isAvailable = conflictingEvents.length === 0;
        
        // Additional debugging for the specific problematic slot
        if (slotStart.getUTCHours() === 8 && slotStart.getUTCMinutes() === 15) {
          console.log(`\n🚨 DEBUGGING 8:15 AM UTC SLOT:`);
          console.log(`  Slot Start: ${slotStart.toISOString()}`);
          console.log(`  Slot End: ${slotEnd.toISOString()}`);
          console.log(`  Slot Date: ${slotStart.toISOString().split('T')[0]}`);
          console.log(`  All Busy Times: ${allBusyTimes.length}`);
          allBusyTimes.forEach((bt, i) => {
            console.log(`    ${i+1}. ${bt.source}: ${bt.start.toISOString()} to ${bt.end.toISOString()}`);
            console.log(`        Busy Date: ${bt.start.toISOString().split('T')[0]}`);
            const overlap = (
              (slotStart >= bt.start && slotStart < bt.end) ||
              (slotEnd > bt.start && slotEnd <= bt.end) ||
              (slotStart <= bt.start && slotEnd >= bt.end)
            );
            console.log(`        Overlap: ${overlap} (Slot: ${slotStart.getTime()}, Busy: ${bt.start.getTime()})`);
          });
          console.log(`  Conflicts Found: ${conflictingEvents.length}`);
          console.log(`  Is Available: ${isAvailable}`);
        }

        if (slotEnd <= dayEnd) {
          const slot = {
            start: new Date(slotStart),
            end: new Date(slotEnd),
            duration,
            isAvailable,
            conflicts: conflictingEvents.map((conflict: any) => ({
              source: conflict.source,
              start: conflict.start,
              end: conflict.end,
              callId: conflict.callId || null,
              summary: conflict.summary || null,
              dmId: conflict.dmId || null
            }))
          };
          
          availableSlots.push(slot);
          
          // Log conflicts for debugging
          if (!isAvailable) {
            console.log(`❌ CONFLICT at ${slotStart.toISOString()}:`);
            conflictingEvents.forEach((conflict: any) => {
              console.log(`   - ${conflict.source}: ${conflict.start.toISOString()} to ${conflict.end.toISOString()}`);
            });
          }
        }
      }
    }

    console.log(`✅ Generated ${availableSlots.length} slots total, ${availableSlots.filter(s => !s.isAvailable).length} blocked by conflicts`);
    console.log('=== END AVAILABILITY CHECK ===\n');
    
    return availableSlots;
  } catch (error) {
    console.error("Error getting available slots:", error);
    throw error;
  }
}

// Update calendar event
export async function updateCalendarEvent(
  eventId: string,
  eventData: any,
  calendarId: string = "primary",
) {
  try {
    const response = await calendar.events.update({
      calendarId,
      eventId,
      sendUpdates: "all",
      requestBody: eventData,
    });

    return response.data;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    throw error;
  }
}

// Delete calendar event
export async function deleteCalendarEvent(
  eventId: string,
  calendarId: string = "primary",
) {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: "all",
    });

    return true;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    throw error;
  }
}
