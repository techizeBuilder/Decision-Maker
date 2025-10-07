import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function SuspensionAlert({ suspension }) {
  if (!suspension || !suspension.isActive) {
    return null;
  }

  const endDate = new Date(suspension.endDate);
  const daysRemaining = Math.ceil(
    (endDate - new Date()) / (1000 * 60 * 60 * 24),
  );

  return (
    <Alert className="mb-6 border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="space-y-2">
          <div className="font-semibold">
            Account Suspended - {suspension.type}
          </div>
          <div className="text-sm">
            <p>{suspension.suspensionReason}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Until: {format(endDate, "MMM dd, yyyy")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{daysRemaining} days remaining</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-red-600 mt-2">
            While suspended, you cannot book meetings or invite new decision
            makers. Your suspension will be lifted when a decision maker
            completes a call successfully without negative feedback.
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
