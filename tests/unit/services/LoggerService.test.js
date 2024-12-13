const winston = require('winston');
const LoggerService = require('../../../src/services/LoggerService');

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    json: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    DailyRotateFile: jest.fn(),
  },
}));

describe('LoggerService', () => {
  let mockLogger;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock logger methods
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      http: jest.fn(),
      debug: jest.fn(),
    };
    
    winston.createLogger.mockReturnValue(mockLogger);
  });

  describe('Core logging methods', () => {
    it('should log error messages with metadata', () => {
      const message = 'Test error';
      const metadata = { requestId: '123' };
      
      LoggerService.error(message, metadata);
      
      expect(mockLogger.error).toHaveBeenCalledWith(message, metadata);
    });

    it('should handle Error objects in error logging', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      error.statusCode = 500;
      
      LoggerService.error(error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(error.message, {
        error: expect.objectContaining({
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
        }),
      });
    });

    it('should log warn messages', () => {
      const message = 'Test warning';
      const metadata = { context: 'test' };
      
      LoggerService.warn(message, metadata);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(message, metadata);
    });

    it('should log info messages', () => {
      const message = 'Test info';
      const metadata = { userId: '123' };
      
      LoggerService.info(message, metadata);
      
      expect(mockLogger.info).toHaveBeenCalledWith(message, metadata);
    });

    it('should log http messages', () => {
      const message = 'Test HTTP';
      const metadata = { path: '/api/test' };
      
      LoggerService.http(message, metadata);
      
      expect(mockLogger.http).toHaveBeenCalledWith(message, metadata);
    });

    it('should log debug messages', () => {
      const message = 'Test debug';
      const metadata = { debug: true };
      
      LoggerService.debug(message, metadata);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(message, metadata);
    });
  });

  describe('Request logging', () => {
    it('should log HTTP requests with appropriate level based on status code', () => {
      const req = {
        id: '123',
        method: 'GET',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla'),
        user: { id: 'user123' },
        body: {},
        path: '/api/test',
      };
      
      const res = {
        statusCode: 200,
      };
      
      LoggerService.logRequest(req, res, 100);
      
      expect(mockLogger.http).toHaveBeenCalledWith(
        'GET /api/test',
        expect.objectContaining({
          requestId: '123',
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          duration: '100ms',
          userId: 'user123',
        })
      );
    });

    it('should use warn level for error status codes', () => {
      const req = {
        id: '123',
        method: 'GET',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla'),
        user: { id: 'user123' },
        body: {},
        path: '/api/test',
      };
      
      const res = {
        statusCode: 500,
      };
      
      LoggerService.logRequest(req, res, 100);
      
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should skip excluded paths', () => {
      const req = {
        path: '/health',
        method: 'GET',
        originalUrl: '/health',
      };
      
      const res = {
        statusCode: 200,
      };
      
      LoggerService.logRequest(req, res, 100);
      
      expect(mockLogger.http).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Database logging', () => {
    it('should log database operations', () => {
      LoggerService.logDatabase('SELECT', 50, true);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Database operation',
        expect.objectContaining({
          operation: 'SELECT',
          duration: '50ms',
          success: true,
        })
      );
    });

    it('should log slow queries as warnings', () => {
      LoggerService.logDatabase('SELECT', 2000, true);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow database query detected',
        expect.objectContaining({
          operation: 'SELECT',
          duration: '2000ms',
          success: true,
        })
      );
    });

    it('should include error details for failed operations', () => {
      const error = new Error('Database error');
      
      LoggerService.logDatabase('INSERT', 100, false, error);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Database operation',
        expect.objectContaining({
          operation: 'INSERT',
          success: false,
          error: expect.objectContaining({
            name: error.name,
            message: error.message,
          }),
        })
      );
    });
  });

  describe('Audit logging', () => {
    it('should log audit events when enabled', () => {
      const action = 'user.login';
      const userId = 'user123';
      const details = { ip: '127.0.0.1' };
      
      LoggerService.logAudit(action, userId, details);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Audit event',
        expect.objectContaining({
          action,
          userId,
          details,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Utility methods', () => {
    it('should format errors correctly', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      error.statusCode = 500;
      
      const formattedError = LoggerService.formatError(error);
      
      expect(formattedError).toEqual({
        name: error.name,
        message: error.message,
        stack: expect.any(String),
        code: error.code,
        statusCode: error.statusCode,
      });
    });

    it('should detect sensitive data in objects', () => {
      const sensitiveObj = {
        username: 'test',
        password: 'secret',
      };
      
      const result = LoggerService.containsSensitiveData(sensitiveObj);
      
      expect(result).toBe(true);
    });
  });
});