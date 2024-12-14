import PropTypes from "prop-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

const AlertDashboard = ({ events, connectionStatus }) => {
  // Group events by severity
  const groupedEvents = events.reduce((acc, event) => {
    const severity = getEventSeverity(event.type);
    if (!acc[severity]) acc[severity] = [];
    acc[severity].push(event);
    return acc;
  }, {});

  const isConnected = connectionStatus === "connected";

  return (
    <div className="w-full space-y-4">
      <div
        className={`px-4 py-2 rounded-md text-sm ${
          isConnected
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {isConnected
          ? "Connected to Alert System"
          : "Disconnected from Alert System"}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Alert Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SeverityCard
              title="Critical"
              count={groupedEvents.critical?.length || 0}
              icon={AlertCircle}
              variant="destructive"
            />
            <SeverityCard
              title="Warning"
              count={groupedEvents.warning?.length || 0}
              icon={AlertTriangle}
              variant="warning"
            />
            <SeverityCard
              title="Info"
              count={groupedEvents.info?.length || 0}
              icon={Info}
              variant="default"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="space-y-4">
              {events.map((event, index) => (
                <Alert
                  key={index}
                  variant={getEventVariant(event.type)}
                  className="relative"
                >
                  <div className="absolute top-2 right-2">
                    <Badge variant={getEventVariant(event.type)}>
                      {formatTime(event.timestamp)}
                    </Badge>
                  </div>
                  <AlertTitle className="mb-2">{event.type}</AlertTitle>
                  <AlertDescription>
                    {formatEventDescription(event)}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

AlertDashboard.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.number.isRequired,
      type: PropTypes.string.isRequired,
      load: PropTypes.number,
      threshold: PropTypes.number,
      usage: PropTypes.number,
      rate: PropTypes.number,
      responseTime: PropTypes.number,
      count: PropTypes.number,
      pending: PropTypes.number,
      total: PropTypes.number,
      data: PropTypes.object,
    })
  ).isRequired,
  connectionStatus: PropTypes.oneOf(["connected", "disconnected", "error"])
    .isRequired,
};

AlertDashboard.defaultProps = {
  events: [],
};

const SeverityCard = ({ title, count, icon: Icon, variant }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
        <Icon
          className={`w-6 h-6 ${
            variant === "destructive"
              ? "text-red-500"
              : variant === "warning"
                ? "text-yellow-500"
                : "text-blue-500"
          }`}
        />
      </div>
    </CardContent>
  </Card>
);

SeverityCard.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  icon: PropTypes.elementType.isRequired,
  variant: PropTypes.oneOf(["destructive", "warning", "default"]).isRequired,
};

// Utility functions with TypeScript-like JSDoc comments
/**
 * Get event severity based on event type
 * @param {string} type - Event type
 * @returns {'critical' | 'warning' | 'info'} Event severity
 */
const getEventSeverity = (type) => {
  if (type.includes("HIGH") || type.includes("ERROR")) return "critical";
  if (type.includes("WARN")) return "warning";
  return "info";
};

/**
 * Get event variant for styling
 * @param {string} type - Event type
 * @returns {'destructive' | 'warning' | 'default'} UI variant
 */
const getEventVariant = (type) => {
  if (type.includes("HIGH") || type.includes("ERROR")) return "destructive";
  if (type.includes("WARN")) return "warning";
  return "default";
};

/**
 * Format timestamp to locale time string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted time string
 */
const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString();
};

/**
 * Format event description based on event type and data
 * @param {Object} event - Event object
 * @returns {string} Formatted description
 */
const formatEventDescription = (event) => {
  const descriptions = {
    HIGH_CPU_LOAD: `CPU load at ${event.load?.toFixed(1)} exceeded threshold of ${event.threshold?.toFixed(1)}`,
    HIGH_MEMORY_USAGE: `Memory usage at ${event.usage?.toFixed(1)}% exceeded threshold of ${event.threshold}%`,
    HIGH_ERROR_RATE: `Error rate of ${(event.rate * 100).toFixed(1)}% exceeded threshold of ${(event.threshold * 100).toFixed(1)}%`,
    HIGH_RESPONSE_TIME: `Average response time of ${event.responseTime}ms exceeded threshold of ${event.threshold}ms`,
    SLOW_QUERIES_DETECTED: `Detected ${event.count} slow queries`,
    DATABASE_POOL_PENDING: `${event.pending} pending connections out of ${event.total} total connections`,
  };

  return descriptions[event.type] || JSON.stringify(event.data || {});
};

export default AlertDashboard;
