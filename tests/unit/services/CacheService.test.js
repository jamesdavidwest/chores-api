const CacheService = require('../../../src/services/CacheService');
const LoggerService = require('../../../src/services/LoggerService');

// Mock LoggerService
jest.mock('../../../src/services/LoggerService', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

describe('CacheService', () => {
    beforeEach(() => {
        // Clear cache and reset stats before each test
        CacheService.clear();
        jest.clearAllMocks();
    });

    describe('Basic Operations', () => {
        it('should set and get values correctly', async () => {
            await CacheService.set('test', { data: 'value' });
            const result = await CacheService.get('test');

            expect(result.value).toEqual({ data: 'value' });
            expect(result.metadata).toBeDefined();
            expect(result.metadata.accessCount).toBe(1);
        });

        it('should return null for non-existent keys', async () => {
            const result = await CacheService.get('nonexistent');
            expect(result).toBeNull();
        });

        it('should delete values correctly', async () => {
            await CacheService.set('test', 'value');
            const deleted = await CacheService.delete('test');
            const result = await CacheService.get('test');

            expect(deleted).toBe(true);
            expect(result).toBeNull();
        });

        it('should clear all values', async () => {
            await CacheService.set('test1', 'value1');
            await CacheService.set('test2', 'value2');
            
            await CacheService.clear();
            
            expect(await CacheService.get('test1')).toBeNull();
            expect(await CacheService.get('test2')).toBeNull();
        });
    });

    describe('TTL and Expiration', () => {
        it('should expire entries after TTL', async () => {
            // Set with 1 second TTL
            await CacheService.set('test', 'value', { ttl: 1 });
            
            // Should exist immediately
            let result = await CacheService.get('test');
            expect(result.value).toBe('value');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            // Should be expired
            result = await CacheService.get('test');
            expect(result).toBeNull();
        });

        it('should use default TTL when not specified', async () => {
            await CacheService.set('test', 'value');
            const result = await CacheService.get('test');
            
            expect(result.metadata.expiresAt).toBeDefined();
            expect(result.metadata.expiresAt).toBeGreaterThan(Date.now());
        });
    });

    describe('Statistics and Monitoring', () => {
        it('should track cache statistics correctly', async () => {
            await CacheService.set('test', 'value');
            await CacheService.get('test');
            await CacheService.get('nonexistent');
            await CacheService.delete('test');

            const stats = CacheService.getStats();
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
            expect(stats.sets).toBe(1);
            expect(stats.deletes).toBe(1);
        });

        it('should calculate hit rate correctly', async () => {
            await CacheService.set('test', 'value');
            await CacheService.get('test'); // hit
            await CacheService.get('nonexistent'); // miss

            const stats = CacheService.getStats();
            expect(stats.hitRate).toBe('50.00%');
        });

        it('should monitor performance correctly', async () => {
            const mockCallback = jest.fn();
            const monitorId = CacheService.monitorPerformance('test.*', mockCallback);

            await CacheService.set('test1', 'value1');
            await CacheService.get('test1');
            await CacheService.delete('test1');

            expect(mockCallback).not.toHaveBeenCalled(); // assuming operations were fast

            CacheService.stopMonitoring(monitorId);
        });
    });

    describe('Distributed Locking', () => {
        it('should acquire and release locks correctly', async () => {
            const token = await CacheService.acquireLock('resource1');
            expect(token).toBeDefined();

            // Try to acquire same lock
            const token2 = await CacheService.acquireLock('resource1');
            expect(token2).toBeNull();

            // Release lock
            const released = await CacheService.releaseLock('resource1', token);
            expect(released).toBe(true);

            // Should be able to acquire lock again
            const token3 = await CacheService.acquireLock('resource1');
            expect(token3).toBeDefined();
        });

        it('should handle lock expiration', async () => {
            const token = await CacheService.acquireLock('resource1', 1);
            expect(token).toBeDefined();

            // Wait for lock to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should be able to acquire lock after expiration
            const token2 = await CacheService.acquireLock('resource1');
            expect(token2).toBeDefined();
        });

        it('should not release lock with invalid token', async () => {
            const token = await CacheService.acquireLock('resource1');
            const released = await CacheService.releaseLock('resource1', 'invalid-token');
            expect(released).toBe(false);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle undefined values', async () => {
            await CacheService.set('test', undefined);
            const result = await CacheService.get('test');
            expect(result.value).toBeUndefined();
        });

        it('should handle null values', async () => {
            await CacheService.set('test', null);
            const result = await CacheService.get('test');
            expect(result.value).toBeNull();
        });

        it('should handle complex objects', async () => {
            const complexObj = {
                array: [1, 2, { nested: true }],
                date: new Date(),
                regex: /test/,
                func: function() {}
            };

            await CacheService.set('test', complexObj);
            const result = await CacheService.get('test');
            expect(result.value).toEqual(complexObj);
        });
    });

    describe('Integration with Logger', () => {
        it('should log cache operations', async () => {
            await CacheService.set('test', 'value');
            expect(LoggerService.debug).toHaveBeenCalledWith(
                'Cache entry set',
                expect.objectContaining({
                    key: 'test',
                    ttl: expect.any(Number),
                    entryId: expect.any(String)
                })
            );

            await CacheService.delete('test');
            expect(LoggerService.debug).toHaveBeenCalledWith(
                'Cache entry deleted',
                expect.objectContaining({ key: 'test' })
            );

            await CacheService.clear();
            expect(LoggerService.info).toHaveBeenCalledWith('Cache cleared');
        });
    });
});
