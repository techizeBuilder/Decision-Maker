import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Building,
  Star,
  X,
  Loader2,
  CheckCircle,
  Mail,
  Lock,
  Crown,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const BookingModal = ({ isOpen, onClose, decisionMaker, onConfirm }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check calendar connection status
  const { data: calendarStatus, isLoading: calendarStatusLoading } = useQuery({
    queryKey: ["/api/calendar/status"],
    retry: false,
    enabled: isOpen, // Only fetch when modal is open
  });

  // Fetch decision maker's calendar availability when date is selected
  const { data: dmAvailability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["/api/calendar/availability", decisionMaker?.id, selectedDate?.getTime()],
    queryFn: async () => {
      if (!selectedDate || !decisionMaker?.id) return null;

      // Create start and end dates for the selected day - CRITICAL FIX for date boundary
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const date = selectedDate.getDate();
      
      const startDate = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));

      console.log("🔍 CRITICAL FIX - FETCHING AVAILABILITY:", {
        dmId: decisionMaker.id,
        selectedDate: selectedDate.toISOString(),
        selectedDateOnly: selectedDate.toDateString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dateCheck: `MUST include ${selectedDate.toDateString()} ONLY`,
        utcCheck: `UTC range: ${startDate.getUTCDate()}/${startDate.getUTCMonth()+1} to ${endDate.getUTCDate()}/${endDate.getUTCMonth()+1}`,
        criticalFix: 'Using Date.UTC to prevent timezone issues'
      });

      const response = await apiRequest(
        `/api/calendar/availability/${decisionMaker.id}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&duration=15`,
      );

      console.log("✅ AVAILABILITY RESPONSE RECEIVED:", {
        totalSlots: response?.availableSlots?.length || 0,
        unavailableSlots: response?.availableSlots?.filter(s => !s.isAvailable)?.length || 0,
        conflictingSlots: response?.availableSlots?.filter(s => s.conflicts?.length > 0)?.map(slot => ({
          start: slot.start,
          isAvailable: slot.isAvailable,
          conflicts: slot.conflicts?.length || 0,
          time: new Date(slot.start).toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
          })
        })) || [],
      });

      return response;
    },
    enabled: !!(isOpen && selectedDate && decisionMaker?.id),
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache results
  });

  // Determine if user has email access
  const hasEmailAccess =
    user?.packageType === "enterprise" || user?.hasEmailAddon;

  // Check if calendar is connected
  const isCalendarConnected = calendarStatus?.connected;

  // Generate available time slots (8 AM to 6 PM in 15-minute intervals)
  const generateTimeSlots = (date) => {
    const slots = [];
    const today = new Date();
    const selectedDay = new Date(date);
    const isToday = selectedDay.toDateString() === today.toDateString();

    // Get available slots from DM's calendar
    const availableSlots = dmAvailability?.availableSlots || [];

    console.log("GenerateTimeSlots Debug:", {
      selectedDate: selectedDay.toISOString(),
      availableSlotsCount: availableSlots.length,
      availableSlots: availableSlots.map((slot) => ({
        start: slot.start,
        end: slot.end,
        isAvailable: slot.isAvailable,
        conflicts: slot.conflicts?.length || 0
      })),
    });

    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const slotTime = new Date(selectedDay);
        slotTime.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotTime.getTime() + 15 * 60 * 1000); // 15 minutes later

        // Skip past time slots if it's today
        const isPast = isToday && slotTime <= today;

        // Check if this slot conflicts with DM's scheduled calls
        let isDMUnavailable = false;

        if (dmAvailability && dmAvailability.availableSlots !== undefined) {
          // Look for this specific time slot in the availability data
          const matchingSlot = availableSlots.find((availableSlot) => {
            const availableStart = new Date(availableSlot.start);
            const availableEnd = new Date(availableSlot.end);

            // Check if this is the same time slot (within 1 minute tolerance)
            return (
              Math.abs(slotTime.getTime() - availableStart.getTime()) < 60000 &&
              Math.abs(slotEnd.getTime() - availableEnd.getTime()) < 60000
            );
          });

          if (matchingSlot) {
            // We found the exact slot in the availability data
            isDMUnavailable = !matchingSlot.isAvailable;

            const indianTime = slotTime.toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour12: true,
              hour: "2-digit",
              minute: "2-digit",
            });

            console.log("Slot availability check:", {
              time: slotTime.toISOString(),
              indianTime: indianTime,
              matchingSlot: {
                start: matchingSlot.start,
                end: matchingSlot.end,
                isAvailable: matchingSlot.isAvailable,
                conflicts: matchingSlot.conflicts?.length || 0,
              },
              isDMUnavailable,
            });
          } else {
            // If no exact match found, assume available (default behavior)
            isDMUnavailable = false;
          }
        }

        const timeString = slotTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        const slotData = {
          time: timeString,
          value: slotTime,
          disabled: isPast || isDMUnavailable,
          unavailableReason: isDMUnavailable
            ? "DM has another meeting"
            : isPast
              ? "Time has passed"
              : null,
          debugInfo: {
            utc: slotTime.toISOString(),
            slotEnd: slotEnd.toISOString(),
            isDMUnavailable,
            isPast,
          },
        };

        slots.push(slotData);
      }
    }

    console.log(
      "Generated slots sample:",
      slots.slice(0, 5).map((s) => ({
        time: s.time,
        utc: s.debugInfo.utc,
        disabled: s.disabled,
        reason: s.unavailableReason,
      })),
    );

    return slots;
  };

  // Get days in month for calendar
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const isCurrentMonth = currentDate.getMonth() === month;
      const isPast = currentDate < today;
      const isToday = currentDate.toDateString() === today.toDateString();

      days.push({
        date: currentDate,
        day: currentDate.getDate(),
        isCurrentMonth,
        isPast,
        isToday,
        disabled: isPast || !isCurrentMonth,
      });
    }
    return days;
  };

  const handleDateSelect = (day) => {
    if (day.disabled) return;
    setSelectedDate(day.date);
    setSelectedTimeSlot(null); // Reset time slot when date changes
  };

  const handleTimeSlotSelect = (slot) => {
    if (slot.disabled) return;
    setSelectedTimeSlot(slot);
  };

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (bookingData) => {
      // First check if current user can book calls
      const userCanBook = await apiRequest("/api/user/can-book-calls");
      if (!userCanBook.canBook) {
        throw new Error(
          `You have reached your monthly call limit: ${userCanBook.message}`,
        );
      }

      const response = await apiRequest("/api/calendar/book-slot", {
        method: "POST",
        body: JSON.stringify(bookingData),
      });
      return response;
    },
    onSuccess: (data) => {
      setBookingSuccess(true);

      // Store booking data for success display
      setBookingData(data.booking);

      toast({
        title: "Call Booked Successfully!",
        description: data.calendarIntegrated
          ? `Your call with ${decisionMaker.name} is scheduled and added to your Google Calendar with Google Meet link`
          : `Your call with ${decisionMaker.name} is scheduled for ${selectedDate.toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )} at ${selectedTimeSlot.time}`,
        duration: 5000,
      });

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-rep/metrics"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/calendar/upcoming-meetings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/sales-rep/available-dms-gated"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/can-book-calls"] });

      // Close modal after 3 seconds to show booking details
      setTimeout(() => {
        handleClose();
      }, 3000);
    },
    onError: (error) => {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description:
          error.message || "Unable to book the call. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    // Check if calendar is connected first
    if (!isCalendarConnected) {
      toast({
        title: "Calendar Required",
        description:
          "Please connect your Google Calendar first to book calls. You can connect it from your dashboard.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (selectedDate && selectedTimeSlot) {
      // Calculate start and end times
      const startTime = new Date(selectedDate);
      startTime.setHours(
        selectedTimeSlot.value.getHours(),
        selectedTimeSlot.value.getMinutes(),
        0,
        0,
      );

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 15); // 15-minute meetings

      const bookingData = {
        dmId: decisionMaker.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        agenda: agenda || "Business discussion",
        notes: notes || "",
      };

      bookingMutation.mutate(bookingData);
    }
  };

  const handleClose = () => {
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setAgenda("");
    setNotes("");
    setBookingSuccess(false);
    setBookingData(null);
    onClose();
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const days = getDaysInMonth(currentMonth);
  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200"
        aria-describedby="booking-dialog-description"
      >
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Book a Call
          </DialogTitle>
          <div id="booking-dialog-description" className="sr-only">
            Schedule a meeting with {decisionMaker?.name} by selecting a date
            and time slot.
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6">
          {/* Decision Maker Info */}
          <div className="space-y-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Decision Maker
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">
                      {decisionMaker?.name}
                    </h4>
                    <p className="text-gray-600">{decisionMaker?.jobTitle}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">
                      {decisionMaker?.company}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-gray-700">
                      {decisionMaker?.engagementScore}% engagement
                    </span>
                  </div>

                  {/* Email Access Section */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {user?.packageType === "enterprise" ? (
                      // Enterprise users - always show email
                      <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <Mail className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-green-800">
                            Email: {decisionMaker?.email || "Not available"}
                          </div>
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Enterprise Access
                          </div>
                        </div>
                      </div>
                    ) : user?.packageType === "basic" ||
                      user?.packageType === "pro" ||
                      user?.packageType === "pro-team" ? (
                      // Basic/Pro users - show email if addon purchased
                      hasEmailAccess ? (
                        <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                          <Mail className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="text-sm font-medium text-green-800">
                              Email: {decisionMaker?.email || "Not available"}
                            </div>
                            <div className="text-xs text-green-600">
                              Email Addon Active
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <Lock className="w-4 h-4 text-amber-600" />
                          <div>
                            <div className="text-sm font-medium text-amber-800">
                              Email: Hidden
                            </div>
                            <div className="text-xs text-amber-600">
                              Purchase $5 addon to unlock email access
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      // Free users - no email access
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <Lock className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">
                            Email: Not Available
                          </div>
                          <div className="text-xs text-gray-500">
                            Upgrade to Basic or higher for email access
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      15 Minutes
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    This will be a brief introduction call to discuss potential
                    collaboration opportunities.
                  </p>
                </div>

                {/* Call Limits Display */}
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-900 font-medium">
                        Call Availability
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-green-700">
                    <div>
                      DM: {decisionMaker?.remainingCalls || 3} /{" "}
                      {decisionMaker?.maxCalls || 3} calls remaining
                    </div>
                    <div>
                      You:{" "}
                      {decisionMaker?.canBookCalls
                        ? "Available"
                        : "Limit reached"}
                    </div>
                  </div>
                </div>

                {/* Agenda and Notes */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meeting Agenda (Optional)
                    </label>
                    <input
                      type="text"
                      value={agenda}
                      onChange={(e) => setAgenda(e.target.value)}
                      placeholder="e.g., Product demo, Partnership discussion"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional information or preparation notes..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar and Time Selection */}
          <div className="space-y-6">
            {/* Calendar */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select Date
                  </h3>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {monthNames[currentMonth.getMonth()]}{" "}
                    {currentMonth.getFullYear()}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-gray-500 py-2"
                      >
                        {day}
                      </div>
                    ),
                  )}
                  {days.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(day)}
                      disabled={day.disabled}
                      className={`
                        text-center py-2 px-1 text-sm rounded-lg transition-colors
                        ${
                          day.disabled
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-700 hover:bg-blue-50 cursor-pointer"
                        }
                        ${day.isToday ? "font-bold text-blue-600" : ""}
                        ${
                          selectedDate &&
                          selectedDate.toDateString() ===
                            day.date.toDateString()
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : ""
                        }
                      `}
                    >
                      {day.day}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time Slots */}
            {selectedDate && (
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Select Time
                    </h3>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>

                  {availabilityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">
                        Checking availability...
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {timeSlots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleTimeSlotSelect(slot)}
                          disabled={slot.disabled}
                          title={slot.unavailableReason || ""}
                          className={`
                            py-2 px-3 text-sm rounded-lg border transition-colors relative
                            ${
                              slot.disabled
                                ? slot.unavailableReason ===
                                  "DM has another meeting"
                                  ? "text-red-400 bg-red-50 border-red-200 cursor-not-allowed"
                                  : "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed"
                                : "text-gray-700 bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-300 cursor-pointer"
                            }
                            ${
                              selectedTimeSlot &&
                              selectedTimeSlot.time === slot.time
                                ? "bg-blue-600 text-white border-blue-600"
                                : ""
                            }
                          `}
                        >
                          <div className="flex flex-col items-center">
                            <span>{slot.time}</span>
                            {slot.unavailableReason ===
                              "DM has another meeting" && (
                              <span className="text-xs text-red-600 mt-1">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Legend for time slot colors */}
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                      <span>DM Unavailable</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
                      <span>Past Time</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4">
          {bookingSuccess ? (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Call booked successfully!</span>
              </div>

              {bookingData && (
                <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-gray-600">
                    <strong>Confirmation:</strong>{" "}
                    {bookingData.confirmationCode}
                  </div>

                  {bookingData.calendarIntegrated && (
                    <div className="text-sm text-gray-600">
                      <strong>Calendar:</strong> Added to your Google Calendar
                    </div>
                  )}

                  {bookingData.googleMeetLink && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        <strong>Google Meet Link:</strong>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() =>
                          window.open(bookingData.googleMeetLink, "_blank")
                        }
                      >
                        Open Google Meet
                      </Button>
                    </div>
                  )}

                  {/* DM Contact Information */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <strong>Decision Maker Contact:</strong>
                    </div>
                    {hasEmailAccess ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Email Access Available
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <strong>Email:</strong>{" "}
                          {decisionMaker?.email || "Not available"}
                        </div>
                        <div className="text-sm text-gray-700">
                          <strong>Name:</strong> {decisionMaker?.name}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800">
                            Email Access Limited
                          </span>
                        </div>
                        <div className="text-sm text-amber-700 mb-2">
                          {user?.packageType === "basic" ||
                          user?.packageType === "pro" ? (
                            <>
                              Purchase the $5 Email Access addon to see contact
                              details
                            </>
                          ) : (
                            <>Upgrade to Enterprise for full contact access</>
                          )}
                        </div>
                        <div className="text-sm text-gray-700">
                          <strong>Name:</strong> {decisionMaker?.name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={bookingMutation.isPending}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  !selectedDate ||
                  !selectedTimeSlot ||
                  bookingMutation.isPending
                }
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {bookingMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking Call...
                  </>
                ) : (
                  "Book Call"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
