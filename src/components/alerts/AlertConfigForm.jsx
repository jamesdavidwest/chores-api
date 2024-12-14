import React, { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Subcomponent for metric threshold configuration
const MetricThresholdConfig = ({
  metricName,
  threshold,
  onChange,
  unit = "",
  description = "",
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{metricName}</Label>
    {description && <p className="text-xs text-gray-500">{description}</p>}
    <div className="flex items-center space-x-2">
      <Input
        type="number"
        value={threshold}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24"
      />
      {unit && <span className="text-sm text-gray-500">{unit}</span>}
    </div>
  </div>
);

// Main AlertConfigForm component
const AlertConfigForm = () => {
  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [configSyncStatus, setConfigSyncStatus] = useState(null);

  // Form state
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    enabled: true,
    severity: "warning",
    systemMetrics: {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90,
    },
    applicationMetrics: {
      errorRate: 5,
      responseTime: 1000,
      requestQueueSize: 100,
    },
    databaseMetrics: {
      connectionPoolUsage: 80,
      queryTime: 500,
      deadlockCount: 1,
    },
  });

  // Error state
  const [error, setError] = useState(null);
  // Success state
  const [success, setSuccess] = useState(false);
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WebSocket connection and handlers
  useEffect(() => {
    let ws = null;

    const connectWebSocket = () => {
      try {
        ws = window.MetricsWebSocketService.connect();

        ws.addEventListener("open", () => {
          setWsConnected(true);
          console.log("WebSocket connected");
        });

        ws.addEventListener("close", () => {
          setWsConnected(false);
          console.log("WebSocket disconnected");
          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        });

        ws.addEventListener("message", (event) => {
          const data = JSON.parse(event.data);

          // Handle different types of messages
          switch (data.type) {
            case "CONFIG_UPDATE":
              setConfigSyncStatus("Config synchronized");
              break;
            case "METRIC_UPDATE":
              // Update real-time metrics if needed
              break;
            case "VALIDATION_ERROR":
              setError(data.message);
              break;
            default:
              console.log("Unknown message type:", data.type);
          }
        });

        ws.addEventListener("error", (error) => {
          console.error("WebSocket error:", error);
          setError("WebSocket connection error");
        });
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error);
        setError("Failed to establish real-time connection");
      }
    };

    connectWebSocket();

    // Cleanup function
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce(async (config) => {
      try {
        if (wsConnected) {
          const validationResult =
            await window.AlertNotificationService.validateConfig(config);
          if (!validationResult.isValid) {
            setError(validationResult.message);
          } else {
            setError(null);
          }
        }
      } catch (err) {
        console.error("Validation error:", err);
      }
    }, 500),
    [wsConnected]
  );

  // Handle form field changes
  const handleInputChange = (field, value) => {
    const newState = {
      ...formState,
      [field]: value,
    };

    setFormState(newState);
    debouncedValidate(newState);
  };

  // Handle metric threshold changes
  const handleMetricChange = (category, metric, value) => {
    setFormState((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [metric]: value,
      },
    }));
  };

  // Form validation
  const validateForm = () => {
    if (!formState.name.trim()) {
      setError("Alert configuration name is required");
      return false;
    }

    // Validate thresholds are within reasonable ranges
    const { systemMetrics, applicationMetrics, databaseMetrics } = formState;

    if (
      systemMetrics.cpuUsage < 0 ||
      systemMetrics.cpuUsage > 100 ||
      systemMetrics.memoryUsage < 0 ||
      systemMetrics.memoryUsage > 100 ||
      systemMetrics.diskUsage < 0 ||
      systemMetrics.diskUsage > 100
    ) {
      setError("System metric thresholds must be between 0 and 100");
      return false;
    }

    if (
      applicationMetrics.errorRate < 0 ||
      applicationMetrics.responseTime < 0 ||
      applicationMetrics.requestQueueSize < 0
    ) {
      setError("Application metric thresholds cannot be negative");
      return false;
    }

    if (
      databaseMetrics.connectionPoolUsage < 0 ||
      databaseMetrics.connectionPoolUsage > 100 ||
      databaseMetrics.queryTime < 0 ||
      databaseMetrics.deadlockCount < 0
    ) {
      setError("Database metric thresholds are invalid");
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      // Create the alert configuration using the service
      const alertConfig = {
        ...formState,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
      };

      // Send to AlertNotificationService
      const result =
        await window.AlertNotificationService.createAlertConfig(alertConfig);

      // Notify through WebSocket
      if (wsConnected) {
        window.MetricsWebSocketService.send({
          type: "CONFIG_CREATE",
          payload: result,
        });
      }

      setSuccess(true);
      // Reset form after successful submission
      setFormState({
        name: "",
        description: "",
        enabled: true,
        severity: "warning",
        systemMetrics: {
          cpuUsage: 80,
          memoryUsage: 85,
          diskUsage: 90,
        },
        applicationMetrics: {
          errorRate: 5,
          responseTime: 1000,
          requestQueueSize: 100,
        },
        databaseMetrics: {
          connectionPoolUsage: 80,
          queryTime: 500,
          deadlockCount: 1,
        },
      });
    } catch (err) {
      setError(err.message || "Failed to create alert configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create Alert Configuration</CardTitle>
          <CardDescription>
            Configure alert thresholds for system, application, and database
            metrics
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Configuration Name</Label>
              <Input
                id="name"
                value={formState.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter configuration name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formState.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Enter configuration description"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enabled</Label>
                <div className="text-sm text-gray-500">
                  Toggle alert configuration
                </div>
              </div>
              <Switch
                checked={formState.enabled}
                onCheckedChange={(checked) =>
                  handleInputChange("enabled", checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Severity Level</Label>
              <Select
                value={formState.severity}
                onValueChange={(value) => handleInputChange("severity", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metric Thresholds */}
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="system" className="flex-1">
                System
              </TabsTrigger>
              <TabsTrigger value="application" className="flex-1">
                Application
              </TabsTrigger>
              <TabsTrigger value="database" className="flex-1">
                Database
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-4 mt-4">
              <MetricThresholdConfig
                metricName="CPU Usage"
                threshold={formState.systemMetrics.cpuUsage}
                onChange={(value) =>
                  handleMetricChange("systemMetrics", "cpuUsage", value)
                }
                unit="%"
                description="Alert when CPU usage exceeds threshold"
              />
              <MetricThresholdConfig
                metricName="Memory Usage"
                threshold={formState.systemMetrics.memoryUsage}
                onChange={(value) =>
                  handleMetricChange("systemMetrics", "memoryUsage", value)
                }
                unit="%"
                description="Alert when memory usage exceeds threshold"
              />
              <MetricThresholdConfig
                metricName="Disk Usage"
                threshold={formState.systemMetrics.diskUsage}
                onChange={(value) =>
                  handleMetricChange("systemMetrics", "diskUsage", value)
                }
                unit="%"
                description="Alert when disk usage exceeds threshold"
              />
            </TabsContent>

            <TabsContent value="application" className="space-y-4 mt-4">
              <MetricThresholdConfig
                metricName="Error Rate"
                threshold={formState.applicationMetrics.errorRate}
                onChange={(value) =>
                  handleMetricChange("applicationMetrics", "errorRate", value)
                }
                unit="%"
                description="Alert when error rate exceeds threshold"
              />
              <MetricThresholdConfig
                metricName="Response Time"
                threshold={formState.applicationMetrics.responseTime}
                onChange={(value) =>
                  handleMetricChange(
                    "applicationMetrics",
                    "responseTime",
                    value
                  )
                }
                unit="ms"
                description="Alert when response time exceeds threshold"
              />
              <MetricThresholdConfig
                metricName="Request Queue Size"
                threshold={formState.applicationMetrics.requestQueueSize}
                onChange={(value) =>
                  handleMetricChange(
                    "applicationMetrics",
                    "requestQueueSize",
                    value
                  )
                }
                description="Alert when request queue size exceeds threshold"
              />
            </TabsContent>

            <TabsContent value="database" className="space-y-4 mt-4">
              <MetricThresholdConfig
                metricName="Connection Pool Usage"
                threshold={formState.databaseMetrics.connectionPoolUsage}
                onChange={(value) =>
                  handleMetricChange(
                    "databaseMetrics",
                    "connectionPoolUsage",
                    value
                  )
                }
                unit="%"
                description="Alert when connection pool usage exceeds threshold"
              />
              <MetricThresholdConfig
                metricName="Query Time"
                threshold={formState.databaseMetrics.queryTime}
                onChange={(value) =>
                  handleMetricChange("databaseMetrics", "queryTime", value)
                }
                unit="ms"
                description="Alert when query time exceeds threshold"
              />
              <MetricThresholdConfig
                metricName="Deadlock Count"
                threshold={formState.databaseMetrics.deadlockCount}
                onChange={(value) =>
                  handleMetricChange("databaseMetrics", "deadlockCount", value)
                }
                description="Alert when deadlock count exceeds threshold"
              />
            </TabsContent>
          </Tabs>

          {/* Connection Status */}
          {!wsConnected && (
            <Alert
              variant="warning"
              className="bg-yellow-50 text-yellow-700 border-yellow-200"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Real-time connection unavailable. Some features may be limited.
              </AlertDescription>
            </Alert>
          )}

          {/* Sync Status */}
          {configSyncStatus && (
            <Alert className="bg-blue-50 text-blue-700 border-blue-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{configSyncStatus}</AlertDescription>
            </Alert>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert
              variant="success"
              className="bg-green-50 text-green-700 border-green-200"
            >
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Alert configuration created successfully!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-end space-x-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Configuration"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default AlertConfigForm;
