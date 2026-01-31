import { describe, it, expect } from 'vitest';
import { MockBookLookupService } from './BookLookupService.js';

describe('MockBookLookupService', () => {
  it('returns book info for known ISBN', async () => {
    const service = new MockBookLookupService();

    const result = await service.lookupByIsbn('978-0-13-468599-1');

    expect(result).toEqual({
      title: 'Clean Code',
      author: 'Robert C. Martin',
      basePrice: 10.00,
    });
  });

  it('returns null for unknown ISBN', async () => {
    const service = new MockBookLookupService();

    const result = await service.lookupByIsbn('unknown-isbn');

    expect(result).toBeNull();
  });
});
