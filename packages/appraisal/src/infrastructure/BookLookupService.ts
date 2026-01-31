export interface BookInfo {
  title: string;
  author: string;
  basePrice: number;
}

export interface BookLookupService {
  lookupByIsbn(isbn: string): Promise<BookInfo | null>;
}

const MOCK_BOOKS: Record<string, BookInfo> = {
  '978-0-13-468599-1': {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    basePrice: 10.00,
  },
  '978-0-201-63361-0': {
    title: 'Design Patterns',
    author: 'Gang of Four',
    basePrice: 15.00,
  },
};

export class MockBookLookupService implements BookLookupService {
  async lookupByIsbn(isbn: string): Promise<BookInfo | null> {
    return MOCK_BOOKS[isbn] ?? null;
  }
}
