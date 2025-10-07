import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  Video,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Demo data for available time slots
const generateDemoSlots = () => {
  const slots = [];
  const today = new Date();

  for (let day = 1; day <= 7; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);

    // Skip weekends for demo
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Generate 3-4 slots per day
    const startTimes = [9, 11, 14, 16]; // 9 AM, 11 AM, 2 PM, 4 PM

    startTimes.forEach((hour) => {
      if (Math.random() > 0.3) {
        // Randomly skip some slots to show realistic availability
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setMinutes(start.getMinutes() + 30);

        slots.push({ start, end });
      }
    });
  }

  return slots;
};

export default function CalendarDemo({ decisionMakers = [] }) {
  const { toast } = useToast();
  const [selectedDecisionMaker, setSelectedDecisionMaker] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState({
    title: "",
    description: "",
    duration: 30,
  });

  // Demo availability data
  const demoAvailability = selectedDecisionMaker ? generateDemoSlots() : [];

  const handleScheduleMeeting = async () => {
    if (!selectedSlot || !selectedDecisionMaker) return;

    setIsScheduling(true);

    // Simulate API call delay
    setTimeout(() => {
      toast({
        title: "Demo Meeting Scheduled!",
        description: `Meeting with ${selectedDecisionMaker.firstName} ${selectedDecisionMaker.lastName} scheduled for ${formatTimeSlot(selectedSlot).day} at ${formatTimeSlot(selectedSlot).timeRange}`,
      });

      setIsScheduling(false);
      setIsBookingOpen(false);
      setSelectedSlot(null);
      setMeetingDetails({ title: "", description: "", duration: 30 });
    }, 2000);
  };

  const formatTimeSlot = (slot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const day = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeRange = `${start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })} - ${end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;

    return { day, timeRange };
  };

  const groupSlotsByDay = (slots) => {
    if (!slots) return {};

    return slots.reduce((groups, slot) => {
      const date = new Date(slot.start).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(slot);
      return groups;
    }, {});
  };

  return (
    <div className="space-y-6">
      {/* Calendar Status - Demo Mode */}
      <Card className="shadow-lg border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="text-blue-500 mr-3" size={20} />
              Calendar Integration (Demo Mode)
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              <CheckCircle className="mr-1 h-3 w-3" />
              Demo Active
            </Badge>
          </CardTitle>
          <CardDescription>
            This is a demonstration of the Google Calendar integration. In
            production, this would connect to real Google Calendar accounts.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Decision Maker Selection */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="text-purple-500 mr-3" size={20} />
            Schedule Meeting
          </CardTitle>
          <CardDescription>
            Select a decision maker to view their demo availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="decision-maker">Decision Maker</Label>
              <Select
                onValueChange={(value) => {
                  const dm = decisionMakers.find((dm) => dm.id === value);
                  setSelectedDecisionMaker(dm);
                  setSelectedSlot(null);
                }}
              >
                <SelectTrigger id="decision-maker">
                  <SelectValue placeholder="Select a decision maker" />
                </SelectTrigger>
                <SelectContent>
                  {decisionMakers.length > 0 ? (
                    decisionMakers.map((dm) => (
                      <SelectItem key={dm.id} value={dm.id}>
                        {dm.firstName} {dm.lastName} - {dm.company}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="demo" disabled>
                      No decision makers available - Send some invitations first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedDecisionMaker && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">
                  {selectedDecisionMaker.firstName}{" "}
                  {selectedDecisionMaker.lastName}
                </h4>
                <p className="text-sm text-blue-700">
                  {selectedDecisionMaker.jobTitle} at{" "}
                  {selectedDecisionMaker.company}
                </p>
                <Badge className="mt-2 bg-blue-200 text-blue-800">
                  Demo User
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Time Slots */}
      {selectedDecisionMaker && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="text-blue-500 mr-3" size={20} />
              Available Times (Demo)
            </CardTitle>
            <CardDescription>
              These are simulated available time slots. In production, these
              would come from real Google Calendar data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {demoAvailability.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupSlotsByDay(demoAvailability)).map(
                  ([date, slots]) => (
                    <div key={date} className="space-y-2">
                      <h4 className="font-medium text-gray-900">
                        {new Date(date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {slots.map((slot, index) => {
                          const { timeRange } = formatTimeSlot(slot);
                          const isSelected = selectedSlot === slot;

                          return (
                            <Button
                              key={index}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedSlot(slot)}
                              className={`text-xs ${isSelected ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                            >
                              {timeRange}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}

                {selectedSlot && (
                  <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <Video className="mr-2 h-4 w-4" />
                        Book Selected Time (Demo)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule Demo Meeting</DialogTitle>
                        <DialogDescription>
                          This will simulate scheduling a meeting. In
                          production, this would create a real calendar event.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="font-medium">
                            {selectedDecisionMaker.firstName}{" "}
                            {selectedDecisionMaker.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatTimeSlot(selectedSlot).day} at{" "}
                            {formatTimeSlot(selectedSlot).timeRange}
                          </p>
                          <Badge className="mt-1 bg-yellow-100 text-yellow-800">
                            Demo Mode
                          </Badge>
                        </div>

                        <div>
                          <Label htmlFor="meeting-title">Meeting Title</Label>
                          <Input
                            id="meeting-title"
                            value={meetingDetails.title}
                            onChange={(e) =>
                              setMeetingDetails((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            placeholder="Sales Discussion"
                          />
                        </div>

                        <div>
                          <Label htmlFor="meeting-description">
                            Description (Optional)
                          </Label>
                          <Input
                            id="meeting-description"
                            value={meetingDetails.description}
                            onChange={(e) =>
                              setMeetingDetails((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Discuss partnership opportunities..."
                          />
                        </div>

                        <Button
                          onClick={handleScheduleMeeting}
                          disabled={isScheduling}
                          className="w-full"
                        >
                          {isScheduling ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Scheduling Demo Meeting...
                            </>
                          ) : (
                            "Schedule Demo Meeting"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="text-gray-300 mx-auto mb-4" size={48} />
                <p className="text-gray-500">
                  Demo availability will appear here when you select a decision
                  maker
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Demo Notice */}
      <Card className="shadow-lg border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="bg-yellow-100 p-2 rounded-full">
              <Calendar className="text-yellow-600" size={16} />
            </div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">
                Demo Mode Active
              </h4>
              <p className="text-sm text-yellow-700">
                This is a demonstration of the Google Calendar integration. In
                production, users would connect their real Google Calendar
                accounts to view actual availability and schedule real meetings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
