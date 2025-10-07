import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Building,
  Phone,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  Loader2,
  Plus,
} from "lucide-react";

export default function CalendarBooking() {
  const { toast } = useToast();
  const [selectedDM, setSelectedDM] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState("week"); // 'week', 'month', or 'agenda'
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isDMSelectionOpen, setIsDMSelectionOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    agenda: "",
    notes: "",
  });

  // Responsive screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      // Auto-switch to agenda view on mobile for better UX
      if (isMobile && viewType === "week") {
        setViewType("agenda");
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [viewType]);

  // Get available DMs
  const { data: availableDMs = [], isLoading: dmsLoading } = useQuery({
    queryKey: ["/api/calendar/available-dms"],
    retry: false,
  });

  // Get DM availability for selected DM and date range
  const {
    data: availability = {},
    isLoading: availabilityLoading,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ["/api/calendar/dm-availability", selectedDM?.id, getDateRange()],
    enabled: !!selectedDM,
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      return await apiRequest(
        `/api/calendar/dm-availability/${selectedDM.id}?startDate=${startDate}&endDate=${endDate}`,
      );
    },
    retry: false,
  });

  // Get user's meetings
  const { data: myMeetings = [], refetch: refetchMeetings } = useQuery({
    queryKey: ["/api/calendar/my-meetings", getDateRange()],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      return await apiRequest(
        `/api/calendar/my-meetings?startDate=${startDate}&endDate=${endDate}`,
      );
    },
    retry: false,
  });

  // Book meeting mutation
  const bookMeetingMutation = useMutation({
    mutationFn: async (bookingData) => {
      return await apiRequest("/api/calendar/book-slot", {
        method: "POST",
        body: JSON.stringify(bookingData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Meeting Booked Successfully",
        description: `Meeting with ${selectedSlot.dmName} scheduled for ${formatDateTime(selectedSlot.startTime)}`,
      });
      setIsBookingDialogOpen(false);
      setSelectedSlot(null);
      setBookingForm({ agenda: "", notes: "" });
      refetchAvailability();
      refetchMeetings();
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book the meeting slot",
        variant: "destructive",
      });
    },
  });

  function getDateRange() {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewType === "week") {
      // Get start of week (Monday)
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);

      // Get end of week (Sunday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // Get start of month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      // Get end of month
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }

  function navigateDate(direction) {
    const newDate = new Date(currentDate);
    if (viewType === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatTime(dateString) {
    return new Date(dateString).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getWeekDays() {
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    start.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function getTimeSlots() {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  }

  function getSlotForDateTime(date, time) {
    if (!availability.availabilitySlots) return null;

    const [hour, minute] = time.split(":").map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hour, minute, 0, 0);

    return availability.availabilitySlots.find((slot) => {
      const slotTime = new Date(slot.startTime);
      return Math.abs(slotTime.getTime() - slotDateTime.getTime()) < 60000; // 1 minute tolerance
    });
  }

  function handleSlotClick(slot) {
    if (!slot || !slot.available) return;

    setSelectedSlot(slot);
    setIsBookingDialogOpen(true);
  }

  function handleBookingSubmit() {
    if (!selectedSlot) return;

    bookMeetingMutation.mutate({
      dmId: selectedSlot.dmId,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      agenda: bookingForm.agenda || "Business Meeting",
      notes: bookingForm.notes,
    });
  }

  function getSlotClassName(slot) {
    if (!slot) return "bg-gray-100 cursor-not-allowed";
    if (slot.available)
      return "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer border-green-300";
    if (slot.booked)
      return "bg-red-100 text-red-800 cursor-not-allowed border-red-300";
    return "bg-gray-100 cursor-not-allowed";
  }

  function getSlotContent(slot) {
    if (!slot) return "";
    if (slot.available) return "✅";
    if (slot.booked) return "❌";
    return "";
  }

  // Skip weekends
  const weekDays = getWeekDays().filter(
    (day) => day.getDay() !== 0 && day.getDay() !== 6,
  );
  const timeSlots = getTimeSlots();

  return (
    <div className="space-y-6">
      {/* Responsive Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <CalendarIcon
              className="text-blue-600 mr-2 sm:mr-3 flex-shrink-0"
              size={isMobileView ? 20 : 28}
            />
            <span className="truncate">Meeting Calendar</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Book meetings with decision makers
          </p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className="w-full sm:w-32 min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agenda">Agenda View</SelectItem>
              <SelectItem value="week">Week View</SelectItem>
              <SelectItem value="month">Month View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Responsive DM Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center min-w-0">
              <User className="text-blue-600 mr-2 flex-shrink-0" size={20} />
              <span className="truncate">Decision Maker Selection</span>
            </div>
            <Dialog
              open={isDMSelectionOpen}
              onOpenChange={setIsDMSelectionOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto sm:ml-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Select Decision Maker
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-7xl max-h-[90vh] sm:max-h-[85vh]">
                <DialogHeader className="border-b border-gray-200 pb-4">
                  <DialogTitle className="flex items-center text-sm sm:text-lg font-mono">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600 text-xs sm:text-sm">
                        DATABASE:
                      </span>
                      <span className="text-blue-600 text-xs sm:text-sm">
                        decision_makers
                      </span>
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm font-mono text-gray-500 break-all">
                    SELECT * FROM decision_makers WHERE status = 'available'
                    ORDER BY engagement_score DESC;
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 max-h-[65vh] overflow-auto">
                  {dmsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
                      <span className="ml-3 font-mono text-sm">
                        Executing query...
                      </span>
                    </div>
                  ) : availableDMs.length > 0 ? (
                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                      {/* Mobile View - Stacked Cards */}
                      <div className="block md:hidden">
                        <div className="bg-gray-100 border-b border-gray-300 p-3">
                          <div className="font-mono text-xs font-semibold text-gray-700 uppercase">
                            {availableDMs.length} RECORDS FOUND
                          </div>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {availableDMs.map((dm, index) => (
                            <div
                              key={dm.id}
                              onClick={() => {
                                setSelectedDM(dm);
                                setIsDMSelectionOpen(false);
                              }}
                              className={`p-4 cursor-pointer transition-colors hover:bg-blue-50 ${
                                selectedDM?.id === dm.id
                                  ? "bg-blue-100 border-l-4 border-l-blue-500"
                                  : ""
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-mono text-xs text-gray-500">
                                    ID: {String(index + 1).padStart(3, "0")}
                                  </div>
                                  {selectedDM?.id === dm.id ? (
                                    <CheckCircle className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <div className="w-4 h-4 border border-gray-300 rounded"></div>
                                  )}
                                </div>
                                <div className="font-mono text-sm font-semibold text-gray-900">
                                  {dm.name}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                  <div>
                                    <span className="text-gray-500">
                                      TITLE:
                                    </span>
                                    <div className="text-gray-700 truncate">
                                      {dm.title}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      SCORE:
                                    </span>
                                    <div className="text-green-600 font-semibold">
                                      {dm.engagementScore || 0}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                  <div>
                                    <span className="text-gray-500">
                                      COMPANY:
                                    </span>
                                    <div className="text-gray-700 truncate">
                                      {dm.company}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      INDUSTRY:
                                    </span>
                                    <div className="text-gray-600 truncate">
                                      {dm.industry || "NULL"}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="inline-flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="ml-1 font-mono text-xs text-green-600">
                                      ACTIVE
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Desktop View - Table */}
                      <div className="hidden md:block">
                        {/* Database Table Header */}
                        <div className="bg-gray-100 border-b border-gray-300">
                          <div className="grid grid-cols-12 gap-0 text-xs font-mono font-semibold text-gray-700 uppercase tracking-wide">
                            <div className="col-span-1 p-2 lg:p-3 border-r border-gray-300 text-center">
                              ID
                            </div>
                            <div className="col-span-2 p-2 lg:p-3 border-r border-gray-300">
                              NAME
                            </div>
                            <div className="col-span-2 p-2 lg:p-3 border-r border-gray-300">
                              TITLE
                            </div>
                            <div className="col-span-2 p-2 lg:p-3 border-r border-gray-300">
                              COMPANY
                            </div>
                            <div className="col-span-2 p-2 lg:p-3 border-r border-gray-300">
                              INDUSTRY
                            </div>
                            <div className="col-span-1 p-2 lg:p-3 border-r border-gray-300 text-center">
                              SCORE
                            </div>
                            <div className="col-span-1 p-2 lg:p-3 border-r border-gray-300 text-center">
                              STATUS
                            </div>
                            <div className="col-span-1 p-2 lg:p-3 text-center">
                              ACTION
                            </div>
                          </div>
                        </div>

                        {/* Database Table Body */}
                        <div className="divide-y divide-gray-200">
                          {availableDMs.map((dm, index) => (
                            <div
                              key={dm.id}
                              onClick={() => {
                                setSelectedDM(dm);
                                setIsDMSelectionOpen(false);
                              }}
                              className={`grid grid-cols-12 gap-0 cursor-pointer transition-colors hover:bg-blue-50 ${
                                selectedDM?.id === dm.id
                                  ? "bg-blue-100 border-l-4 border-l-blue-500"
                                  : ""
                              }`}
                            >
                              <div className="col-span-1 p-2 lg:p-3 border-r border-gray-200 text-center">
                                <span className="font-mono text-xs text-gray-600">
                                  {String(index + 1).padStart(3, "0")}
                                </span>
                              </div>
                              <div className="col-span-2 p-2 lg:p-3 border-r border-gray-200">
                                <div className="font-mono text-xs lg:text-sm text-gray-900 truncate">
                                  {dm.name}
                                </div>
                              </div>
                              <div className="col-span-2 p-2 lg:p-3 border-r border-gray-200">
                                <div className="font-mono text-xs lg:text-sm text-gray-700 truncate">
                                  {dm.title}
                                </div>
                              </div>
                              <div className="col-span-2 p-2 lg:p-3 border-r border-gray-200">
                                <div className="font-mono text-xs lg:text-sm text-gray-700 truncate">
                                  {dm.company}
                                </div>
                              </div>
                              <div className="col-span-2 p-2 lg:p-3 border-r border-gray-200">
                                <div className="font-mono text-xs lg:text-sm text-gray-600 truncate">
                                  {dm.industry || "NULL"}
                                </div>
                              </div>
                              <div className="col-span-1 p-2 lg:p-3 border-r border-gray-200 text-center">
                                <div className="font-mono text-xs lg:text-sm font-semibold text-green-600">
                                  {dm.engagementScore || 0}
                                </div>
                              </div>
                              <div className="col-span-1 p-2 lg:p-3 border-r border-gray-200 text-center">
                                <div className="inline-flex items-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="ml-1 font-mono text-xs text-green-600 hidden lg:inline">
                                    ACTIVE
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-1 p-2 lg:p-3 text-center">
                                {selectedDM?.id === dm.id ? (
                                  <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600 mx-auto" />
                                ) : (
                                  <div className="w-3 h-3 lg:w-4 lg:h-4 border border-gray-300 rounded mx-auto cursor-pointer hover:border-blue-500"></div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Database Footer */}
                      <div className="bg-gray-50 border-t border-gray-300 p-3">
                        <div className="flex items-center justify-between text-xs font-mono text-gray-600">
                          <span>Query executed successfully</span>
                          <span>{availableDMs.length} rows returned</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-gray-300 rounded-lg bg-gray-50">
                      <div className="font-mono text-sm text-gray-600 mb-2">
                        Query result: 0 rows
                      </div>
                      <div className="font-mono text-xs text-gray-500">
                        No records found in decision_makers table
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDM ? (
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
              {/* Database Query Header */}
              <div className="bg-gray-100 border-b border-gray-300 p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-1 sm:space-x-2 font-mono text-xs sm:text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">SELECTED:</span>
                    <span className="text-blue-600 truncate">
                      id = {selectedDM.id}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDMSelectionOpen(true)}
                    className="font-mono text-xs bg-white hover:bg-gray-50 border-gray-400 w-full sm:w-auto"
                  >
                    MODIFY
                  </Button>
                </div>
              </div>

              {/* Mobile View - Stacked Layout */}
              <div className="block md:hidden p-3 space-y-3">
                <div className="space-y-2">
                  <div className="font-mono text-xs text-gray-500 uppercase">
                    NAME
                  </div>
                  <div className="font-mono text-sm text-gray-900">
                    {selectedDM.name}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="font-mono text-xs text-gray-500 uppercase">
                      TITLE
                    </div>
                    <div className="font-mono text-sm text-gray-900">
                      {selectedDM.title}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-mono text-xs text-gray-500 uppercase">
                      SCORE
                    </div>
                    <div className="font-mono text-sm font-semibold text-green-600">
                      {selectedDM.engagementScore || 0}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="font-mono text-xs text-gray-500 uppercase">
                      COMPANY
                    </div>
                    <div className="font-mono text-sm text-gray-900">
                      {selectedDM.company}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-mono text-xs text-gray-500 uppercase">
                      INDUSTRY
                    </div>
                    <div className="font-mono text-sm text-gray-700">
                      {selectedDM.industry || "NULL"}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-mono text-xs text-gray-500 uppercase">
                    STATUS
                  </div>
                  <div className="inline-flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="ml-2 font-mono text-sm text-green-600">
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop View - Table Layout */}
              <div className="hidden md:block">
                <div className="divide-y divide-gray-200">
                  <div className="grid grid-cols-4 gap-0">
                    <div className="p-2 lg:p-3 bg-gray-50 border-r border-gray-200 font-mono text-xs font-semibold text-gray-700 uppercase">
                      NAME
                    </div>
                    <div className="p-2 lg:p-3 font-mono text-xs lg:text-sm text-gray-900">
                      {selectedDM.name}
                    </div>
                    <div className="p-2 lg:p-3 bg-gray-50 border-r border-gray-200 font-mono text-xs font-semibold text-gray-700 uppercase">
                      TITLE
                    </div>
                    <div className="p-2 lg:p-3 font-mono text-xs lg:text-sm text-gray-900">
                      {selectedDM.title}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-0">
                    <div className="p-2 lg:p-3 bg-gray-50 border-r border-gray-200 font-mono text-xs font-semibold text-gray-700 uppercase">
                      COMPANY
                    </div>
                    <div className="p-2 lg:p-3 font-mono text-xs lg:text-sm text-gray-900">
                      {selectedDM.company}
                    </div>
                    <div className="p-2 lg:p-3 bg-gray-50 border-r border-gray-200 font-mono text-xs font-semibold text-gray-700 uppercase">
                      INDUSTRY
                    </div>
                    <div className="p-2 lg:p-3 font-mono text-xs lg:text-sm text-gray-700">
                      {selectedDM.industry || "NULL"}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-0">
                    <div className="p-2 lg:p-3 bg-gray-50 border-r border-gray-200 font-mono text-xs font-semibold text-gray-700 uppercase">
                      SCORE
                    </div>
                    <div className="p-2 lg:p-3 font-mono text-xs lg:text-sm font-semibold text-green-600">
                      {selectedDM.engagementScore || 0}
                    </div>
                    <div className="p-2 lg:p-3 bg-gray-50 border-r border-gray-200 font-mono text-xs font-semibold text-gray-700 uppercase">
                      STATUS
                    </div>
                    <div className="p-2 lg:p-3">
                      <div className="inline-flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="ml-2 font-mono text-xs lg:text-sm text-green-600">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Footer */}
              <div className="bg-gray-50 border-t border-gray-300 p-2 sm:p-3">
                <div className="font-mono text-xs text-gray-600">
                  Record loaded successfully • Ready for calendar operations
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border border-gray-300 rounded-lg bg-gray-50">
              <div className="font-mono text-sm text-gray-600 mb-2">
                No active selection
              </div>
              <div className="font-mono text-xs text-gray-500 mb-4">
                Please execute a SELECT query to choose a decision maker
              </div>
              <Button
                onClick={() => setIsDMSelectionOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 font-mono text-sm"
              >
                EXECUTE QUERY
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar View */}
      {selectedDM && (
        <Card>
          <CardHeader className="border-b border-gray-200 p-3 sm:p-4 lg:p-6">
            {/* Mobile Layout (up to md) */}
            <div className="block lg:hidden">
              <div className="flex flex-col space-y-3">
                {/* Header row with table info and navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 font-mono text-xs sm:text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">TABLE:</span>
                    <span className="text-blue-600 hidden sm:inline">
                      availability_slots
                    </span>
                    <span className="text-blue-600 sm:hidden">slots</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate("prev")}
                      className="font-mono text-xs px-2 py-1.5 h-8"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span className="hidden md:inline ml-1">PREV</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate("next")}
                      className="font-mono text-xs px-2 py-1.5 h-8"
                    >
                      <span className="hidden md:inline mr-1">NEXT</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Date display */}
                <div className="text-center">
                  <span className="font-mono text-sm md:text-base font-semibold text-gray-700">
                    <span className="md:hidden">
                      {viewType === "week" || viewType === "agenda"
                        ? `WEEK: ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : `MONTH: ${currentDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                    </span>
                    <span className="hidden md:block">
                      {viewType === "week" || viewType === "agenda"
                        ? `WEEK: ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : `MONTH: ${currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
                    </span>
                  </span>
                </div>

                {/* SQL Query */}
                <div className="font-mono text-xs md:text-sm text-gray-500 break-all bg-gray-50 p-2 md:p-3 rounded border">
                  <span className="block sm:hidden">
                    SELECT * FROM availability_slots WHERE dm_id = '
                    {selectedDM.id}';
                  </span>
                  <span className="hidden sm:block">
                    SELECT * FROM availability_slots WHERE dm_id = '
                    {selectedDM.id}' AND date_range = '
                    {viewType === "week" || viewType === "agenda"
                      ? "current_week"
                      : "current_month"}
                    ';
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Layout (lg and above) */}
            <div className="hidden lg:block">
              <div className="space-y-5">
                {/* Header with table info and navigation */}
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center font-mono text-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
                      <span className="text-gray-500 text-base">
                        CONNECTION:
                      </span>
                      <span className="text-blue-600 font-semibold">
                        availability_slots
                      </span>
                    </div>
                  </CardTitle>

                  <div className="flex items-center bg-gray-50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateDate("prev")}
                      className="font-mono text-sm px-4 py-2 hover:bg-white transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      PREVIOUS
                    </Button>

                    <div className="mx-4 px-6 py-2 bg-white rounded border shadow-sm">
                      <span className="font-mono text-lg font-bold text-gray-800 tracking-wide">
                        {viewType === "week" || viewType === "agenda"
                          ? `${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()} - ${new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}`
                          : `${currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}`}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateDate("next")}
                      className="font-mono text-sm px-4 py-2 hover:bg-white transition-colors"
                    >
                      NEXT
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* Query section */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-mono text-xs text-gray-600 uppercase tracking-wide">
                      Active Query
                    </span>
                  </div>
                  <div className="font-mono text-sm text-gray-700 leading-relaxed">
                    <span className="text-blue-600 font-semibold">SELECT</span>{" "}
                    * <span className="text-blue-600 font-semibold">FROM</span>{" "}
                    availability_slots
                    <br />
                    <span className="text-blue-600 font-semibold">
                      WHERE
                    </span>{" "}
                    dm_id = '
                    <span className="text-green-600">{selectedDM.id}</span>'
                    <span className="text-blue-600 font-semibold">AND</span>{" "}
                    date_range = '
                    <span className="text-green-600">
                      {viewType === "week" || viewType === "agenda"
                        ? "current_week"
                        : "current_month"}
                    </span>
                    ';
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {availabilityLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                <span className="ml-2">Loading availability...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Database Schema Legend */}
                <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                  <div className="bg-gray-100 border-b border-gray-300 p-2 sm:p-3">
                    <div className="font-mono text-xs sm:text-sm font-semibold text-gray-700">
                      SCHEMA: slot_status
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                      <span className="text-gray-700">
                        STATUS = 'AVAILABLE'
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                      <span className="text-gray-700">STATUS = 'BOOKED'</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                      <span className="text-gray-700">
                        STATUS = 'UNAVAILABLE'
                      </span>
                    </div>
                  </div>
                </div>

                {/* Database Table Views */}
                {viewType === "agenda" ? (
                  <div className="space-y-3">
                    {weekDays.map((day, dayIndex) => (
                      <div
                        key={day.toISOString()}
                        className="border border-gray-300 rounded-lg overflow-hidden bg-white"
                      >
                        <div className="bg-gray-100 border-b border-gray-300 p-3">
                          <div className="font-mono text-sm font-semibold text-gray-700">
                            DATE:{" "}
                            {day.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {timeSlots.map((time, timeIndex) => {
                              const slot = getSlotForDateTime(day, time);
                              return (
                                <button
                                  key={`${day.toISOString()}-${time}`}
                                  onClick={() => handleSlotClick(slot)}
                                  disabled={!slot || !slot.available}
                                  className={`p-3 border border-gray-300 font-mono text-xs transition-all duration-200 min-h-[48px] flex items-center justify-center ${getSlotClassName(slot)} ${slot && slot.available ? "hover:border-blue-500 cursor-pointer" : "cursor-not-allowed"}`}
                                >
                                  <div className="text-center">
                                    <div className="text-xs mb-1">{time}</div>
                                    <div className="text-sm font-semibold">
                                      {getSlotContent(slot)}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <div className="min-w-[640px] lg:min-w-0">
                        {/* Database Table Header */}
                        <div
                          className={`grid ${isMobileView ? "grid-cols-3" : "grid-cols-6"} gap-0 bg-gray-100 border-b border-gray-300`}
                        >
                          <div className="p-2 sm:p-3 border-r border-gray-300 font-mono text-xs font-semibold text-gray-700 uppercase text-center">
                            TIME_SLOT
                          </div>
                          {(isMobileView ? weekDays.slice(0, 2) : weekDays).map(
                            (day) => (
                              <div
                                key={day.toISOString()}
                                className="p-2 sm:p-3 border-r border-gray-300 font-mono text-xs font-semibold text-gray-700 uppercase text-center"
                              >
                                <div>
                                  {day
                                    .toLocaleDateString("en-US", {
                                      weekday: "short",
                                    })
                                    .toUpperCase()}
                                </div>
                                <div className="text-sm font-bold">
                                  {String(day.getDate()).padStart(2, "0")}
                                </div>
                              </div>
                            ),
                          )}
                        </div>

                        {/* Database Table Body */}
                        <div className="divide-y divide-gray-200">
                          {timeSlots.map((time) => (
                            <div key={time} className="contents">
                              <div className="p-1 sm:p-2 border-r border-gray-300 bg-gray-50 font-mono text-xs font-medium text-center flex items-center justify-center">
                                {time}
                              </div>
                              {(isMobileView
                                ? weekDays.slice(0, 2)
                                : weekDays
                              ).map((day) => {
                                const slot = getSlotForDateTime(day, time);
                                return (
                                  <div
                                    key={`${day.toISOString()}-${time}`}
                                    onClick={() => handleSlotClick(slot)}
                                    className={`p-1 sm:p-2 border-r border-gray-300 h-10 sm:h-12 flex items-center justify-center font-mono text-xs font-medium transition-all duration-200 ${getSlotClassName(slot)} ${slot && slot.available ? "hover:border-blue-500 cursor-pointer" : "cursor-not-allowed"}`}
                                  >
                                    {getSlotContent(slot)}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>

                        {/* Database Table Footer */}
                        <div className="bg-gray-50 border-t border-gray-300 p-2 sm:p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-gray-600 space-y-1 sm:space-y-0">
                            <span>
                              Query: {timeSlots.length} slots ×{" "}
                              {isMobileView ? 2 : weekDays.length} days
                            </span>
                            <span>
                              {timeSlots.length *
                                (isMobileView ? 2 : weekDays.length)}{" "}
                              records
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Responsive Booking Confirmation Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="text-blue-600 mr-2" size={20} />
              Book Meeting Slot
            </DialogTitle>
            <DialogDescription>
              Confirm your meeting details with {selectedSlot?.dmName}
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="font-medium">{selectedSlot.dmName}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  <span>{formatDateTime(selectedSlot.startTime)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  <span>30 minutes</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="agenda">Meeting Agenda</Label>
                  <Input
                    id="agenda"
                    placeholder="e.g., Product Demo, Partnership Discussion"
                    value={bookingForm.agenda}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        agenda: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information or preparation notes"
                    rows={3}
                    value={bookingForm.notes}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBookingDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBookingSubmit}
              disabled={bookMeetingMutation.isPending}
            >
              {bookMeetingMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Booking...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
