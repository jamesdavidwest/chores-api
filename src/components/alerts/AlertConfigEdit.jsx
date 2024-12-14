import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  CheckCircle2, 
  History,
  Save,
  RotateCcw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Metric Threshold Configuration Component (reused from AlertConfigForm)
const MetricThresholdConfig = ({ 
  metricName, 
  threshold, 
  onChange, 
  unit = '', 
  description = '',
  previousValue = null
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{metricName}</Label>
    {description && (
      <p className="text-xs text-gray-500">{description}</p>
    )}
    <div className="flex items-center space-x-2">
      <Input
        type="number"
        value={threshold}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-24 ${previousValue !== null && previousValue !== threshold ? 'border-yellow-500' : ''}`}
      />
      {unit && <span className="text-sm text-gray-500">{unit}</span>}
      {previousValue !== null && previousValue !== threshold && (
        <span className="text-xs text-yellow-600">
          Previous: {previousValue}{unit}
        </span>
      )}
    </div>
  </div>
);

// History Dialog Component
const HistoryDialog = ({ configId, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const configHistory = await window.AlertNotificationService.getConfigHistory(configId);
        setHistory(configHistory);
        setError(null);
      } catch (err) {
        setError('Failed to load configuration history');
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchHistory();
    }
  }, [configId, isOpen]);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Configuration History</DialogTitle>
        <DialogDescription>
          View previous versions and changes
        </DialogDescription>
      </DialogHeader>
      
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4">Loading history...</div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <Card key={entry.timestamp} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">
                      {new Date(entry.timestamp).toLocaleString()}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Changed by: {entry.user || 'System'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onClose(entry)}
                    className="text-blue-600"
                  >
                    Restore
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {entry.changes.map((change, changeIndex) => (
                    <p key={changeIndex} className="text-sm">
                      <span className="font-medium">{change.field}:</span>{' '}
                      <span className="text-red-500">{change.oldValue}</span>{' '}
                      → <span className="text-green-500">{change.newValue}</span>
                    </p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DialogContent>
  );
};

// Main AlertConfigEdit Component
const AlertConfigEdit = ({ configId, onSave, onCancel }) => {
  // State
  const [originalConfig, setOriginalConfig] = useState(null);
  const [formState, setFormState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // WebSocket connection
  useEffect(() => {
    let ws = null;

    const connectWebSocket = () => {
      try {
        ws = window.MetricsWebSocketService.connect();
        
        ws.addEventListener('open', () => {
          setWsConnected(true);
          console.log('WebSocket connected');
        });

        ws.addEventListener('close', () => {
          setWsConnected(false);
          console.log('WebSocket disconnected');
          setTimeout(connectWebSocket, 5000);
        });

        ws.addEventListener('message', (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'CONFIG_UPDATE' && data.payload.id === configId) {
            handleExternalUpdate(data.payload);
          }
        });

        ws.addEventListener('error', (error) => {
          console.error('WebSocket error:', error);
          setError('WebSocket connection error');
        });

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setError('Failed to establish real-time connection');
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [configId]);

  // Load configuration data
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const config = await window.AlertNotificationService.getAlertConfig(configId);
        setOriginalConfig(config);
        setFormState(config);
        setError(null);
      } catch (err) {
        setError('Failed to load alert configuration');
        console.error('Error fetching configuration:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [configId]);

  // Track changes
  useEffect(() => {
    if (originalConfig && formState) {
      const changed = JSON.stringify(originalConfig) !== JSON.stringify(formState);
      setHasChanges(changed);
    }
  }, [originalConfig, formState]);

  // Handle external updates
  const handleExternalUpdate = (updatedConfig) => {
    if (hasChanges) {
      if (window.confirm('This configuration has been updated externally. Would you like to load the new version? Your unsaved changes will be lost.')) {
        setOriginalConfig(updatedConfig);
        setFormState(updatedConfig);
      }
    } else {
      setOriginalConfig(updatedConfig);
      setFormState(updatedConfig);
    }
  };

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce(async (config) => {
      try {
        if (wsConnected) {
          const validationResult = await window.AlertNotificationService.validateConfig(config);
          if (!validationResult.isValid) {
            setError(validationResult.message);
          } else {
            setError(null);
          }
        }
      } catch (err) {
        console.error('Validation error:', err);
      }
    }, 500),
    [wsConnected]
  );

  // Handle form field changes
  const handleInputChange = (field, value) => {
    const newState = {
      ...formState,
      [field]: value
    };
    
    setFormState(newState);
    debouncedValidate(newState);
  };

  // Handle metric threshold changes
  const handleMetricChange = (category, metric, value) => {
    setFormState(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [metric]: value
      }
    }));
  };

  // Form validation
  const validateForm = () => {
    if (!formState.name.trim()) {
      setError('Alert configuration name is required');
      return false;
    }

    const { systemMetrics, applicationMetrics, databaseMetrics } = formState;

    if (
      systemMetrics.cpuUsage < 0 || systemMetrics.cpuUsage > 100 ||
      systemMetrics.memoryUsage < 0 || systemMetrics.memoryUsage > 100 ||
      systemMetrics.diskUsage < 0 || systemMetrics.diskUsage > 100
    ) {
      setError('System metric thresholds must be between 0 and 100');
      return false;
    }

    if (
      applicationMetrics.errorRate < 0 ||
      applicationMetrics.responseTime < 0 ||
      applicationMetrics.requestQueueSize < 0
    ) {
      setError('Application metric thresholds cannot be negative');
      return false;
    }

    if (
      databaseMetrics.connectionPoolUsage < 0 || databaseMetrics.connectionPoolUsage > 100 ||
      databaseMetrics.queryTime < 0 ||
      databaseMetrics.deadlockCount < 0
    ) {
      setError('Database metric thresholds are invalid');
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

      const updatedConfig = {
        ...formState,
        updatedAt: new Date().toISOString()
      };

      // Send to AlertNotificationService
      const result = await window.AlertNotificationService.updateAlertConfig(configId, updatedConfig);

      // Notify through WebSocket
      if (wsConnected) {
        window.MetricsWebSocketService.send({
          type: 'CONFIG_UPDATE',
          payload: result
        });
      }

      setSuccess(true);
      setOriginalConfig(result);
      if (onSave) {
        onSave(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to update alert configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle history restore
  const handleHistoryRestore = async (historicalConfig) => {
    try {
      setHistoryDialogOpen(false);
      setFormState(historicalConfig);
      setError(null);
      
      // Optionally auto-save the restored version
      if (window.confirm('Would you like to save the restored version?')) {
        await handleSubmit({ preventDefault: () => {} });
      }
    } catch (err) {
      setError('Failed to restore configuration version');
      console.error('Error restoring configuration:', err);
    }
  };

  // Reset changes
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all changes?')) {
      setFormState(originalConfig);
      setError(null);
      setSuccess(false);
    }
  };

  if (loading || !formState) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6">
          <div className="text-center">Loading configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Edit Alert Configuration</CardTitle>
            <CardDescription>
              Modify alert thresholds and settings
            </CardDescription>
          </div>
          <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="ml-4">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </DialogTrigger>
            <HistoryDialog 
              configId={configId}
              isOpen={historyDialogOpen}
              onClose={handleHistoryRestore}
            />
          </Dialog>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Configuration Name</Label>
              <Input
                id="name"
                value={formState.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={originalConfig.name !== formState.name ? 'border-yellow-500' : ''}
              />
              {originalConfig.name !== formState.name && (
                <p className="text-xs text-yellow-600">
                  Previous: {originalConfig.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formState.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={originalConfig.description !== formState.description ? 'border-yellow-500' : ''}
              />
              {originalConfig.description !== formState.description && (
                <p className="text-xs text-yellow-600">
                  Previous: {originalConfig.description}
                </p>
              )}
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
                onCheckedChange={(checked) => handleInputChange('enabled', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Severity Level</Label>
              <Select
                value={formState.severity}
                onValueChange={(value) => handleInputChange('severity', value)}
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
              <TabsTrigger value="system" className="flex-1">System</TabsTrigger>
              <TabsTrigger value="application" className="flex-1">Application</TabsTrigger>
              <TabsTrigger value="database" className="flex-1">Database</TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-4 mt-4">
              <MetricThresholdConfig
                metricName="CPU Usage"
                threshold={formState.systemMetrics.cpuUsage}
                onChange={(value) => handleMetricChange('systemMetrics', 'cpuUsage', value)}
                unit="%"
                description="Alert when CPU usage exceeds threshold"
                previousValue={originalConfig.systemMetrics.cpuUsage}
              />
              <MetricThresholdConfig
                metricName="Memory Usage"
                threshold={formState.systemMetrics.memoryUsage}
                onChange={(value) => handleMetricChange('systemMetrics', 'memoryUsage', value)}
                unit="%"
                description="Alert when memory usage exceeds threshold"
                previousValue={originalConfig.systemMetrics.memoryUsage}
              />
              <MetricThresholdConfig
                metricName="Disk Usage"
                threshold={formState.systemMetrics.diskUsage}
                onChange={(value) => handleMetricChange('systemMetrics', 'diskUsage', value)}
                unit="%"
                description="Alert when disk usage exceeds threshold"
                previousValue={originalConfig.systemMetrics.diskUsage}
              />
            </TabsContent>

            <TabsContent value="application" className="space-y-4 mt-4">
              <MetricThresholdConfig
                metricName="Error Rate"
                threshold={formState.applicationMetrics.errorRate}
                onChange={(value) => handleMetricChange('applicationMetrics', 'errorRate', value)}
                unit="%"
                description="Alert when error rate exceeds threshold"
                previousValue={originalConfig.applicationMetrics.errorRate}
              />
              <MetricThresholdConfig
                metricName="Response Time"
                threshold={formState.applicationMetrics.responseTime}
                onChange={(value) => handleMetricChange('applicationMetrics', 'responseTime', value)}
                unit="ms"
                description="Alert when response time exceeds threshold"
                previousValue={originalConfig.applicationMetrics.responseTime}
              />
              <MetricThresholdConfig
                metricName="Request Queue Size"
                threshold={formState.applicationMetrics.requestQueueSize}
                onChange={(value) => handleMetricChange('applicationMetrics', 'requestQueueSize', value)}
                description="Alert when request queue size exceeds threshold"
                previousValue={originalConfig.applicationMetrics.requestQueueSize}
              />
            </TabsContent>

            <TabsContent value="database" className="space-y-4 mt-4">
              <MetricThresholdConfig
                metricName="Connection Pool Usage"
                threshold={formState.databaseMetrics.connectionPoolUsage}
                onChange={(value) => handleMetricChange('databaseMetrics', 'connectionPoolUsage', value)}
                unit="%"
                description="Alert when connection pool usage exceeds threshold"
                previousValue={originalConfig.databaseMetrics.connectionPoolUsage}
              />
              <MetricThresholdConfig
                metricName="Query Time"
                threshold={formState.databaseMetrics.queryTime}
                onChange={(value) => handleMetricChange('databaseMetrics', 'queryTime', value)}
                unit="ms"
                description="Alert when query time exceeds threshold"
                previousValue={originalConfig.databaseMetrics.queryTime}
              />
              <MetricThresholdConfig
                metricName="Deadlock Count"
                threshold={formState.databaseMetrics.deadlockCount}
                onChange={(value) => handleMetricChange('databaseMetrics', 'deadlockCount', value)}
                description="Alert when deadlock count exceeds threshold"
                previousValue={originalConfig.databaseMetrics.deadlockCount}
              />
            </TabsContent>
          </Tabs>

          {/* Connection Status */}
          {!wsConnected && (
            <Alert variant="warning" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Real-time updates unavailable
              </AlertDescription>
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
            <Alert variant="success" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Configuration updated successfully!</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-between space-x-2">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Changes
            </Button>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !hasChanges}
          >
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default AlertConfigEdit;