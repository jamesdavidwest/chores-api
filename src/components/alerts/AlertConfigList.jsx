import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Power, 
  PowerOff,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { debounce } from 'lodash';

// Status Badge Component
const StatusBadge = ({ status, hasViolations }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return hasViolations 
          ? 'bg-red-100 text-red-700 border-red-200' 
          : 'bg-green-100 text-green-700 border-green-200';
      case 'disabled':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Badge className={getStatusStyles()}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
      {hasViolations && status === 'active' && ' (Alert)'}
    </Badge>
  );
};

// Severity Badge Component
const SeverityBadge = ({ severity }) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'error':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Badge className={getSeverityStyles()}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
};

// Main AlertConfigList Component
const AlertConfigList = () => {
  // State
  const [configurations, setConfigurations] = useState([]);
  const [filteredConfigs, setFilteredConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [wsConnected, setWsConnected] = useState(false);

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
          
          switch (data.type) {
            case 'CONFIG_UPDATE':
              handleConfigUpdate(data.payload);
              break;
            case 'METRIC_VIOLATION':
              handleMetricViolation(data.payload);
              break;
            case 'CONFIG_DELETE':
              handleConfigDelete(data.payload);
              break;
            default:
              console.log('Unknown message type:', data.type);
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
  }, []);

  // Load initial data
  useEffect(() => {
    fetchConfigurations();
  }, []);

  // Handle search and filtering
  useEffect(() => {
    const filtered = configurations.filter(config => 
      config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredConfigs(sorted);
  }, [configurations, searchTerm, sortField, sortDirection]);

  // Fetch configurations
  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const configs = await window.AlertNotificationService.getAlertConfigs();
      setConfigurations(configs);
      setError(null);
    } catch (err) {
      setError('Failed to load alert configurations');
      console.error('Error fetching configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time updates
  const handleConfigUpdate = (updatedConfig) => {
    setConfigurations(prevConfigs => 
      prevConfigs.map(config => 
        config.id === updatedConfig.id ? updatedConfig : config
      )
    );
  };

  const handleMetricViolation = (violation) => {
    setConfigurations(prevConfigs => 
      prevConfigs.map(config => {
        if (config.id === violation.configId) {
          return {
            ...config,
            hasViolations: true,
            latestViolation: violation
          };
        }
        return config;
      })
    );
  };

  const handleConfigDelete = (configId) => {
    setConfigurations(prevConfigs => 
      prevConfigs.filter(config => config.id !== configId)
    );
  };

  // Actions
  const handleToggleStatus = async (configId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      await window.AlertNotificationService.updateAlertConfigStatus(configId, newStatus);
      
      if (wsConnected) {
        window.MetricsWebSocketService.send({
          type: 'CONFIG_STATUS_CHANGE',
          payload: { configId, status: newStatus }
        });
      }
    } catch (err) {
      setError(`Failed to ${currentStatus === 'active' ? 'disable' : 'enable'} configuration`);
      console.error('Error toggling status:', err);
    }
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await window.AlertNotificationService.deleteAlertConfig(configId);
      
      if (wsConnected) {
        window.MetricsWebSocketService.send({
          type: 'CONFIG_DELETE',
          payload: configId
        });
      }
    } catch (err) {
      setError('Failed to delete configuration');
      console.error('Error deleting configuration:', err);
    }
  };

  // Sort handler
  const handleSort = (field) => {
    setSortDirection(current => 
      sortField === field 
        ? (current === 'asc' ? 'desc' : 'asc')
        : 'asc'
    );
    setSortField(field);
  };

  // Debounced search handler
  const handleSearch = debounce((value) => {
    setSearchTerm(value);
  }, 300);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Alert Configurations</CardTitle>
        <CardDescription>
          Manage and monitor your alert configurations
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Search and Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 w-64">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search configurations..."
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full"
            />
          </div>
          {!wsConnected && (
            <Alert variant="warning" className="ml-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Real-time updates unavailable
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Configurations Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <div className="flex items-center space-x-1 cursor-pointer"
                       onClick={() => handleSort('name')}>
                    <span>Name</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Severity</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading configurations...
                  </TableCell>
                </TableRow>
              ) : filteredConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No configurations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <SeverityBadge severity={config.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={config.status} 
                        hasViolations={config.hasViolations} 
                      />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {config.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(config.id, config.status)}>
                            {config.status === 'active' ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Disable
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(config.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertConfigList;