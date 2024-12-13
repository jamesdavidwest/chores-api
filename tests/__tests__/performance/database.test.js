const performanceTestUtils = require('./performanceTestUtils');
const DatabaseCollector = require('../../../src/metrics/collectors/database');
const DatabaseService = require('../../../src/services/DatabaseService');

describe('DatabaseCollector', () => {
  let collector;
  let dbService;

  beforeEach(() => {
    dbService = DatabaseService.getInstance();
    collector = new DatabaseCollector(dbService);
  });

  afterEach(async () => {
    await collector.reset();
  });

  describe('query timing', () => {
    it('should measure query execution time', async () => {
      const query = 'SELECT * FROM users LIMIT 1';
      const timing = await collector.measureQuery(query);
      
      expect(timing).toHaveProperty('query');
      expect(timing).toHaveProperty('duration');
      expect(timing.duration).toBeGreaterThan(0);
    });

    it('should track slow queries', async () => {
      collector.setSlowQueryThreshold(1); // Set very low threshold for testing
      
      // Simulate slow query
      const results = await performanceTestUtils.simulateDatabaseLoad(5);
      results.forEach(result => collector.trackQuery(result.query, result.duration));

      const slowQueries = collector.getSlowQueries();
      expect(slowQueries.length).toBeGreaterThan(0);
      
      slowQueries.forEach(query => {
        expect(query.duration).toBeGreaterThan(1);
      });
    });
  });

  describe('connection pooling', () => {
    it('should monitor connection pool usage', async () => {
      const poolMetrics = await collector.getPoolMetrics();
      
      expect(poolMetrics).toHaveProperty('total');
      expect(poolMetrics).toHaveProperty('active');
      expect(poolMetrics).toHaveProperty('idle');
      expect(poolMetrics).toHaveProperty('waitingRequests');
    });

    it('should detect connection pool pressure', async () => {
      // Simulate high pool usage
      const connections = await Promise.all([
        dbService.getConnection(),
        dbService.getConnection(),
        dbService.getConnection()
      ]);

      const pressure = await collector.analyzePoolPressure();
      
      expect(pressure).toHaveProperty('level');
      expect(pressure).toHaveProperty('recommendations');

      // Clean up connections
      await Promise.all(connections.map(conn => conn.release()));
    });
  });

  describe('query patterns', () => {
    it('should identify common query patterns', async () => {
      // Add some test queries
      const queries = [
        'SELECT * FROM users WHERE id = 1',
        'SELECT * FROM users WHERE id = 2',
        'SELECT * FROM posts WHERE user_id = 1',
        'SELECT * FROM posts WHERE user_id = 2'
      ];

      queries.forEach(query => collector.trackQuery(query, 10));

      const patterns = collector.analyzeQueryPatterns();
      expect(patterns).toHaveProperty('common');
      expect(patterns).toHaveProperty('frequency');
      expect(patterns.common.length).toBeGreaterThan(0);
    });

    it('should suggest query optimizations', async () => {
      // Track some potentially suboptimal queries
      const queries = [
        'SELECT * FROM users',
        'SELECT * FROM posts WHERE user_id IN (SELECT id FROM users)',
        'SELECT * FROM comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = 1)'
      ];

      queries.forEach(query => collector.trackQuery(query, 100));

      const optimizations = collector.suggestQueryOptimizations();
      expect(optimizations.length).toBeGreaterThan(0);
      
      optimizations.forEach(optimization => {
        expect(optimization).toHaveProperty('query');
        expect(optimization).toHaveProperty('suggestion');
        expect(optimization).toHaveProperty('impact');
      });
    });
  });

  describe('performance analytics', () => {
    it('should calculate query performance statistics', async () => {
      // Add varied query times
      const queryTimes = [10, 20, 30, 40, 100];
      queryTimes.forEach(time => {
        collector.trackQuery('SELECT * FROM test', time);
      });

      const stats = collector.calculateQueryStats();
      
      expect(stats).toHaveProperty('mean');
      expect(stats).toHaveProperty('median');
      expect(stats).toHaveProperty('p95');
      expect(stats).toHaveProperty('p99');
      expect(stats.mean).toBe(40);
    });

    it('should detect performance trends', async () => {
      // Simulate degrading performance
      for (let i = 0; i < 5; i++) {
        collector.trackQuery(
          'SELECT * FROM test',
          10 * (i + 1)
        );
      }

      const trends = collector.analyzePerformanceTrends();
      
      expect(trends).toHaveProperty('trend');
      expect(trends).toHaveProperty('degradation');
      expect(trends.trend).toBe('degrading');
    });
  });

  describe('resource utilization', () => {
    it('should track query resource usage', async () => {
      const resourceMetrics = await collector.getResourceMetrics();
      
      expect(resourceMetrics).toHaveProperty('cpu');
      expect(resourceMetrics).toHaveProperty('memory');
      expect(resourceMetrics).toHaveProperty('io');
    });

    it('should identify resource-intensive queries', async () => {
      // Simulate resource-intensive queries
      await performanceTestUtils.simulateDatabaseLoad(10);
      
      const intensiveQueries = collector.findResourceIntensiveQueries();
      
      expect(Array.isArray(intensiveQueries)).toBe(true);
      intensiveQueries.forEach(query => {
        expect(query).toHaveProperty('query');
        expect(query).toHaveProperty('resources');
        expect(query).toHaveProperty('impact');
      });
    });
  });

  describe('error tracking', () => {
    it('should track database errors', async () => {
      // Simulate some database errors
      collector.trackError(new Error('Connection timeout'));
      collector.trackError(new Error('Query syntax error'));

      const errorStats = collector.getErrorStatistics();
      
      expect(errorStats).toHaveProperty('count');
      expect(errorStats).toHaveProperty('types');
      expect(errorStats.count).toBe(2);
    });

    it('should analyze error patterns', () => {
      // Add various types of errors
      ['timeout', 'syntax', 'timeout', 'constraint'].forEach(type => {
        collector.trackError(new Error(`${type} error`));
      });

      const patterns = collector.analyzeErrorPatterns();
      
      expect(patterns).toHaveProperty('mostCommon');
      expect(patterns).toHaveProperty('trends');
      expect(patterns.mostCommon).toBe('timeout');
    });
  });
});