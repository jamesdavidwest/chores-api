const fs = require('fs').promises;
const path = require('path');
const PerformanceReportService = require('../../../src/services/PerformanceReportService');
const MetricsCollector = require('../../../tests/benchmarks/collectors/MetricsCollector');
const MetricsReporter = require('../../../tests/benchmarks/reporters/MetricsReporter');
const LoggerService = require('../../../src/services/LoggerService');

// Mock dependencies
jest.mock('../../../tests/benchmarks/collectors/MetricsCollector');
jest.mock('../../../tests/benchmarks/reporters/MetricsReporter');
jest.mock('../../../src/services/LoggerService');
jest.mock('fs').promises;

describe('PerformanceReportService', () => {
    // Sample metrics data for testing
    const sampleMetrics = {
        metrics: {
            responseTime: {
                '/api/users': { count: 100, average: 50, max: 200 },
                '/api/events': { count: 200, average: 75, max: 300 }
            },
            memory: {
                process: {
                    heapUsed: { current: 800, max: 1000 },
                    heapTotal: { current: 1000, max: 1200 }
                }
            },
            cpu: {
                total: { current: 70, max: 90 }
            },
            database: {
                queryTime: { average: 20, max: 100 }
            }
        },
        thresholdViolations: {
            responseTime: [],
            memory: [],
            cpu: []
        },
        analysis: {
            slowQueries: []
        }
    };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset MetricsCollector mock
        MetricsCollector.getReport.mockReturnValue(sampleMetrics);
        
        // Reset file system mocks
        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockResolvedValue(undefined);
        fs.readdir.mockResolvedValue([]);
        fs.stat.mockResolvedValue({ mtime: new Date() });
        fs.unlink.mockResolvedValue(undefined);
    });

    describe('Report Generation', () => {
        it('should generate scheduled reports in all configured formats', async () => {
            await PerformanceReportService.generateScheduledReport();

            // Verify report generation for each format
            expect(MetricsReporter.generateReport).toHaveBeenCalledTimes(3); // txt, json, html
            expect(LoggerService.info).toHaveBeenCalledWith(
                'Scheduled performance report generated',
                expect.any(Object)
            );
        });

        it('should handle errors during report generation', async () => {
            MetricsCollector.getReport.mockImplementation(() => {
                throw new Error('Collection failed');
            });

            await PerformanceReportService.generateScheduledReport();

            expect(LoggerService.error).toHaveBeenCalledWith(
                'Error generating scheduled performance report',
                expect.any(Object)
            );
        });

        it('should generate on-demand reports with custom options', async () => {
            const options = {
                format: 'json',
                save: true
            };

            await PerformanceReportService.generateOnDemandReport(options);

            expect(MetricsReporter.generateReport).toHaveBeenCalledWith(
                sampleMetrics,
                expect.objectContaining(options)
            );
        });
    });

    describe('Automated Reporting', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
            PerformanceReportService.stopAutomatedReporting();
        });

        it('should start and stop automated reporting', () => {
            PerformanceReportService.startAutomatedReporting();
            expect(PerformanceReportService.reportSchedule).toBeTruthy();

            PerformanceReportService.stopAutomatedReporting();
            expect(PerformanceReportService.reportSchedule).toBeNull();
        });

        it('should generate reports at configured intervals', () => {
            const spy = jest.spyOn(PerformanceReportService, 'generateScheduledReport');
            
            PerformanceReportService.startAutomatedReporting();
            jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 24 hours

            expect(spy).toHaveBeenCalled();
        });

        it('should restart reporting when configuration is updated', () => {
            PerformanceReportService.startAutomatedReporting();
            const originalSchedule = PerformanceReportService.reportSchedule;

            PerformanceReportService.updateConfig({ interval: 12 * 60 * 60 * 1000 }); // 12 hours
            
            expect(PerformanceReportService.reportSchedule).not.toBe(originalSchedule);
            expect(PerformanceReportService.getConfig().interval).toBe(12 * 60 * 60 * 1000);
        });
    });

    describe('Metrics Analysis', () => {
        it('should detect high error rates', async () => {
            const highErrorMetrics = {
                ...sampleMetrics,
                thresholdViolations: {
                    responseTime: Array(30).fill({ endpoint: '/api/test', time: 1000 })
                }
            };
            MetricsCollector.getReport.mockReturnValue(highErrorMetrics);

            await PerformanceReportService.generateScheduledReport();

            expect(LoggerService.warn).toHaveBeenCalledWith(
                'Performance concerns detected',
                expect.objectContaining({
                    alerts: expect.arrayContaining([
                        expect.objectContaining({ type: 'ERROR_RATE' })
                    ])
                })
            );
        });

        it('should detect high memory usage', async () => {
            const highMemoryMetrics = {
                ...sampleMetrics,
                metrics: {
                    ...sampleMetrics.metrics,
                    memory: {
                        process: {
                            heapUsed: { current: 950, max: 1000 },
                            heapTotal: { current: 1000, max: 1200 }
                        }
                    }
                }
            };
            MetricsCollector.getReport.mockReturnValue(highMemoryMetrics);

            await PerformanceReportService.generateScheduledReport();

            expect(LoggerService.warn).toHaveBeenCalledWith(
                'Performance concerns detected',
                expect.objectContaining({
                    alerts: expect.arrayContaining([
                        expect.objectContaining({ type: 'MEMORY_USAGE' })
                    ])
                })
            );
        });

        it('should detect high CPU usage', async () => {
            const highCpuMetrics = {
                ...sampleMetrics,
                metrics: {
                    ...sampleMetrics.metrics,
                    cpu: {
                        total: { current: 90, max: 100 }
                    }
                }
            };
            MetricsCollector.getReport.mockReturnValue(highCpuMetrics);

            await PerformanceReportService.generateScheduledReport();

            expect(LoggerService.warn).toHaveBeenCalledWith(
                'Performance concerns detected',
                expect.objectContaining({
                    alerts: expect.arrayContaining([
                        expect.objectContaining({ type: 'CPU_USAGE' })
                    ])
                })
            );
        });

        it('should detect slow database queries', async () => {
            const slowQueryMetrics = {
                ...sampleMetrics,
                analysis: {
                    slowQueries: [
                        { query: 'SELECT * FROM users', duration: 5000 }
                    ]
                }
            };
            MetricsCollector.getReport.mockReturnValue(slowQueryMetrics);

            await PerformanceReportService.generateScheduledReport();

            expect(LoggerService.warn).toHaveBeenCalledWith(
                'Performance concerns detected',
                expect.objectContaining({
                    alerts: expect.arrayContaining([
                        expect.objectContaining({ type: 'SLOW_QUERIES' })
                    ])
                })
            );
        });
    });

    describe('File Operations', () => {
        it('should create alert logs when performance issues are detected', async () => {
            const highErrorMetrics = {
                ...sampleMetrics,
                thresholdViolations: {
                    responseTime: Array(30).fill({ endpoint: '/api/test', time: 1000 })
                }
            };
            MetricsCollector.getReport.mockReturnValue(highErrorMetrics);

            await PerformanceReportService.generateScheduledReport();

            expect(fs.mkdir).toHaveBeenCalled();
            expect(fs.writeFile).toHaveBeenCalled();
            expect(LoggerService.info).toHaveBeenCalledWith(
                'Performance alerts logged',
                expect.any(Object)
            );
        });

        it('should clean up old reports based on retention policy', async () => {
            const oldFiles = ['old_report_1.json', 'old_report_2.json'];
            fs.readdir.mockResolvedValue(oldFiles);
            fs.stat.mockResolvedValue({ 
                mtime: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) // 31 days old
            });

            await PerformanceReportService.cleanupOldReports();

            expect(fs.unlink).toHaveBeenCalledTimes(oldFiles.length);
            expect(LoggerService.debug).toHaveBeenCalledTimes(oldFiles.length);
        });

        it('should handle file system errors gracefully', async () => {
            fs.readdir.mockRejectedValue(new Error('File system error'));

            await PerformanceReportService.cleanupOldReports();

            expect(LoggerService.error).toHaveBeenCalledWith(
                'Error cleaning up old performance reports',
                expect.any(Object)
            );
        });
    });

    describe('Configuration Management', () => {
        it('should provide current configuration', () => {
            const config = PerformanceReportService.getConfig();

            expect(config).toEqual(expect.objectContaining({
                interval: expect.any(Number),
                formats: expect.any(Array),
                retentionDays: expect.any(Number),
                alertThresholds: expect.any(Object),
                isReportingActive: expect.any(Boolean)
            }));
        });

        it('should update configuration', () => {
            const newConfig = {
                interval: 12 * 60 * 60 * 1000, // 12 hours
                retentionDays: 60,
                alertThresholds: {
                    errorRate: 0.10
                }
            };

            PerformanceReportService.updateConfig(newConfig);

            const updatedConfig = PerformanceReportService.getConfig();
            expect(updatedConfig.interval).toBe(newConfig.interval);
            expect(updatedConfig.retentionDays).toBe(newConfig.retentionDays);
            expect(updatedConfig.alertThresholds.errorRate).toBe(newConfig.alertThresholds.errorRate);
        });

        it('should maintain existing config values when partially updating', () => {
            const originalConfig = PerformanceReportService.getConfig();
            const partialUpdate = {
                retentionDays: 45
            };

            PerformanceReportService.updateConfig(partialUpdate);

            const updatedConfig = PerformanceReportService.getConfig();
            expect(updatedConfig.retentionDays).toBe(45);
            expect(updatedConfig.interval).toBe(originalConfig.interval);
            expect(updatedConfig.formats).toEqual(originalConfig.formats);
        });
    });
});