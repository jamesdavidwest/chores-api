import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Activity } from "lucide-react";
import MetricsDashboard from "./MetricsDashboard";
import AlertDashboard from "./alerts/AlertDashboard";

const PerformanceMonitoringLayout = () => {
  const [wsConnection, setWsConnection] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [alertsData, setAlertsData] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket("ws://localhost:3000/metrics");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setWsConnection(ws);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Route data to appropriate state based on type
      if (data.type === "metrics") {
        setMetricsData(data.payload);
      } else if (data.type === "alerts") {
        setAlertsData(data.payload);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnection(null);
      // Implement reconnection logic here if needed
    };

    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleSubscriptionChange = (subscriptionType) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(
        JSON.stringify({
          action: "subscribe",
          type: subscriptionType,
        })
      );
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      <Card className="bg-background">
        <CardContent className="p-6">
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="metrics"
                onClick={() => handleSubscriptionChange("metrics")}
              >
                <Activity className="w-4 h-4 mr-2" />
                Metrics Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                onClick={() => handleSubscriptionChange("alerts")}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Alerts Dashboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="mt-4">
              <MetricsDashboard
                wsConnection={wsConnection}
                metricsData={metricsData}
              />
            </TabsContent>

            <TabsContent value="alerts" className="mt-4">
              <AlertDashboard
                wsConnection={wsConnection}
                alertsData={alertsData}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitoringLayout;
