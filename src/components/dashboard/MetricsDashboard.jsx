import PropTypes from "prop-types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, Database, Server } from "lucide-react";

const MetricsDashboard = ({ metricsData, connectionStatus }) => {
  return (
    <div className="w-full p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemMetrics data={metricsData.system} />
        <ApplicationMetrics data={metricsData.application} />
        <DatabaseMetrics data={metricsData.database} />
        <RecentEvents events={metricsData.events} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PerformanceChart data={metricsData.application?.responseTime} />
        <ResourceUsageChart data={metricsData.system} />
      </div>

      <div className="mt-4">
        <ConnectionStatus isConnected={connectionStatus === "connected"} />
      </div>
    </div>
  );
};

MetricsDashboard.propTypes = {
  metricsData: PropTypes.shape({
    system: PropTypes.shape({
      cpu: PropTypes.shape({
        usage: PropTypes.number,
        load: PropTypes.arrayOf(PropTypes.number),
        count: PropTypes.number,
      }),
      memory: PropTypes.shape({
        total: PropTypes.number,
        free: PropTypes.number,
        used: PropTypes.number,
        usagePercent: PropTypes.number,
      }),
      uptime: PropTypes.number,
      processMemory: PropTypes.object,
    }),
    application: PropTypes.shape({
      requests: PropTypes.shape({
        total: PropTypes.number,
        active: PropTypes.number,
        errored: PropTypes.number,
      }),
      responseTime: PropTypes.shape({
        average: PropTypes.number,
        percentiles: PropTypes.object,
      }),
      errorRate: PropTypes.number,
      throughput: PropTypes.number,
    }),
    database: PropTypes.shape({
      queries: PropTypes.shape({
        total: PropTypes.number,
        active: PropTypes.number,
        errored: PropTypes.number,
      }),
      responseTime: PropTypes.shape({
        average: PropTypes.number,
        percentiles: PropTypes.object,
      }),
      poolStatus: PropTypes.shape({
        active: PropTypes.number,
        total: PropTypes.number,
        pending: PropTypes.number,
      }),
      slowQueries: PropTypes.array,
    }),
    events: PropTypes.arrayOf(
      PropTypes.shape({
        timestamp: PropTypes.number,
        type: PropTypes.string,
        data: PropTypes.object,
      })
    ),
  }).isRequired,
  connectionStatus: PropTypes.oneOf(["connected", "disconnected", "error"])
    .isRequired,
};

MetricsDashboard.defaultProps = {
  metricsData: {
    system: {},
    application: {},
    database: {},
    events: [],
  },
};

const SystemMetrics = ({ data }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium">System Metrics</CardTitle>
      <Server className="w-4 h-4 text-gray-500" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <MetricItem
          label="CPU Usage"
          value={`${data?.cpu?.usage?.toFixed(1)}%`}
        />
        <MetricItem
          label="Memory Usage"
          value={`${data?.memory?.usagePercent?.toFixed(1)}%`}
        />
        <MetricItem label="Uptime" value={formatUptime(data?.uptime)} />
      </div>
    </CardContent>
  </Card>
);

SystemMetrics.propTypes = {
  data: PropTypes.shape({
    cpu: PropTypes.shape({
      usage: PropTypes.number,
      load: PropTypes.arrayOf(PropTypes.number),
      count: PropTypes.number,
    }),
    memory: PropTypes.shape({
      usagePercent: PropTypes.number,
    }),
    uptime: PropTypes.number,
  }),
};

const ApplicationMetrics = ({ data }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium">Application Metrics</CardTitle>
      <Activity className="w-4 h-4 text-gray-500" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <MetricItem
          label="Active Requests"
          value={data?.requests?.active || 0}
        />
        <MetricItem
          label="Error Rate"
          value={`${(data?.errorRate * 100 || 0).toFixed(2)}%`}
        />
        <MetricItem
          label="Avg Response Time"
          value={`${data?.responseTime?.average?.toFixed(2)}ms`}
        />
      </div>
    </CardContent>
  </Card>
);

ApplicationMetrics.propTypes = {
  data: PropTypes.shape({
    requests: PropTypes.shape({
      active: PropTypes.number,
    }),
    errorRate: PropTypes.number,
    responseTime: PropTypes.shape({
      average: PropTypes.number,
    }),
  }),
};

const DatabaseMetrics = ({ data }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium">Database Metrics</CardTitle>
      <Database className="w-4 h-4 text-gray-500" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <MetricItem label="Active Queries" value={data?.queries?.active || 0} />
        <MetricItem
          label="Avg Query Time"
          value={`${data?.responseTime?.average?.toFixed(2)}ms`}
        />
        <MetricItem
          label="Pool Status"
          value={`${data?.poolStatus?.active || 0}/${data?.poolStatus?.total || 0}`}
        />
      </div>
    </CardContent>
  </Card>
);

DatabaseMetrics.propTypes = {
  data: PropTypes.shape({
    queries: PropTypes.shape({
      active: PropTypes.number,
    }),
    responseTime: PropTypes.shape({
      average: PropTypes.number,
    }),
    poolStatus: PropTypes.shape({
      active: PropTypes.number,
      total: PropTypes.number,
    }),
  }),
};

const RecentEvents = ({ events = [] }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
      <Cpu className="w-4 h-4 text-gray-500" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {events.slice(0, 3).map((event, index) => (
          <div
            key={index}
            className="flex justify-between items-center text-sm"
          >
            <span className="text-gray-500">{event.type}</span>
            <span>{formatTime(event.timestamp)}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

RecentEvents.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      timestamp: PropTypes.number,
    })
  ),
};

RecentEvents.defaultProps = {
  events: [],
};

const PerformanceChart = ({ data = [] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Response Time Trends</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={formatTime} />
            <YAxis />
            <Tooltip labelFormatter={formatTime} />
            <Legend />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#8884d8"
              name="Avg Response Time"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

PerformanceChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.number,
      average: PropTypes.number,
    })
  ),
};

PerformanceChart.defaultProps = {
  data: [],
};

const ResourceUsageChart = ({ data = {} }) => (
  <Card>
    <CardHeader>
      <CardTitle>Resource Usage</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[data]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={formatTime} />
            <YAxis />
            <Tooltip labelFormatter={formatTime} />
            <Legend />
            <Line
              type="monotone"
              dataKey="cpu.usage"
              stroke="#82ca9d"
              name="CPU Usage"
            />
            <Line
              type="monotone"
              dataKey="memory.usagePercent"
              stroke="#ffc658"
              name="Memory Usage"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

ResourceUsageChart.propTypes = {
  data: PropTypes.shape({
    timestamp: PropTypes.number,
    cpu: PropTypes.shape({
      usage: PropTypes.number,
    }),
    memory: PropTypes.shape({
      usagePercent: PropTypes.number,
    }),
  }),
};

ResourceUsageChart.defaultProps = {
  data: {},
};

const ConnectionStatus = ({ isConnected }) => (
  <div
    className={`px-4 py-2 rounded-md text-sm ${
      isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    }`}
  >
    {isConnected
      ? "Connected to Metrics Server"
      : "Disconnected from Metrics Server"}
  </div>
);

ConnectionStatus.propTypes = {
  isConnected: PropTypes.bool.isRequired,
};

const MetricItem = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

MetricItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const formatUptime = (seconds) => {
  if (!seconds) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "< 1m";
};

export default MetricsDashboard;
