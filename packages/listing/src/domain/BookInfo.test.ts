import { describe, it, expect } from 'vitest';
import { BookInfo } from './BookInfo.js';
import { BookCondition } from './BookCondition.js';

describe('BookInfo', () => {
  describe('creation', () => {
    it('should create book info with required fields', () => {
      const bookInfo = new BookInfo({
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Excellent,
      });

      expect(bookInfo.isbn).toBe('978-0-13-468599-1');
      expect(bookInfo.title).toBe('Clean Code');
      expect(bookInfo.author).toBe('Robert C. Martin');
      expect(bookInfo.condition).toBe(BookCondition.Excellent);
    });

    it('should create book info with optional fields', () => {
      const bookInfo = new BookInfo({
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Good,
        coverImageUrl: 'https://example.com/cover.jpg',
        publisher: 'Prentice Hall',
        publishYear: 2008,
        description: 'A Handbook of Agile Software Craftsmanship',
      });

      expect(bookInfo.coverImageUrl).toBe('https://example.com/cover.jpg');
      expect(bookInfo.publisher).toBe('Prentice Hall');
      expect(bookInfo.publishYear).toBe(2008);
      expect(bookInfo.description).toBe('A Handbook of Agile Software Craftsmanship');
    });

    it('should have undefined for missing optional fields', () => {
      const bookInfo = new BookInfo({
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Fair,
      });

      expect(bookInfo.coverImageUrl).toBeUndefined();
      expect(bookInfo.publisher).toBeUndefined();
      expect(bookInfo.publishYear).toBeUndefined();
      expect(bookInfo.description).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should throw error for empty isbn', () => {
      expect(() => new BookInfo({
        isbn: '',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Excellent,
      })).toThrow('ISBN is required');
    });

    it('should throw error for empty title', () => {
      expect(() => new BookInfo({
        isbn: '978-0-13-468599-1',
        title: '',
        author: 'Robert C. Martin',
        condition: BookCondition.Excellent,
      })).toThrow('Title is required');
    });

    it('should throw error for empty author', () => {
      expect(() => new BookInfo({
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: '',
        condition: BookCondition.Excellent,
      })).toThrow('Author is required');
    });

    it('should throw error for whitespace-only fields', () => {
      expect(() => new BookInfo({
        isbn: '   ',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Excellent,
      })).toThrow('ISBN is required');
    });

    it('should throw error for invalid publish year', () => {
      expect(() => new BookInfo({
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Excellent,
        publishYear: 1400,
      })).toThrow('Invalid publish year');
    });

    it('should throw error for future publish year', () => {
      expect(() => new BookInfo({
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Excellent,
        publishYear: 2100,
      })).toThrow('Invalid publish year');
    });
  });

  describe('trimming', () => {
    it('should trim whitespace from string fields', () => {
      const bookInfo = new BookInfo({
        isbn: '  978-0-13-468599-1  ',
        title: '  Clean Code  ',
        author: '  Robert C. Martin  ',
        condition: BookCondition.Excellent,
      });

      expect(bookInfo.isbn).toBe('978-0-13-468599-1');
      expect(bookInfo.title).toBe('Clean Code');
      expect(bookInfo.author).toBe('Robert C. Martin');
    });
  });
});
