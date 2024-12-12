const ResponseFormatter = require('../../../../src/utils/responseFormatter');

describe('ResponseFormatter', () => {
  describe('success', () => {
    it('should format successful response correctly', () => {
      const data = { id: 1, name: 'Test' };
      const response = ResponseFormatter.success(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
      expect(response.metadata.requestId).toBeDefined();
    });
  });

  describe('error', () => {
    it('should format error response correctly', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: { field: 'test' },
      };
      const response = ResponseFormatter.error(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(error.code);
      expect(response.error.message).toBe(error.message);
      expect(response.metadata).toBeDefined();
    });
  });

  describe('withPagination', () => {
    it('should format paginated response correctly', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const paginationData = {
        page: 1,
        limit: 10,
        total: 20,
      };

      const response = ResponseFormatter.withPagination(data, paginationData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata.pagination).toBeDefined();
      expect(response.metadata.pagination.hasMore).toBe(true);
    });
  });
});