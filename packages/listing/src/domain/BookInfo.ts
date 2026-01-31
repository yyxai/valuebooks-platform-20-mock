import { BookCondition } from './BookCondition.js';

export interface BookInfoProps {
  isbn: string;
  title: string;
  author: string;
  condition: BookCondition;
  coverImageUrl?: string;
  publisher?: string;
  publishYear?: number;
  description?: string;
}

export class BookInfo {
  public readonly isbn: string;
  public readonly title: string;
  public readonly author: string;
  public readonly condition: BookCondition;
  public readonly coverImageUrl?: string;
  public readonly publisher?: string;
  public readonly publishYear?: number;
  public readonly description?: string;

  constructor(props: BookInfoProps) {
    const isbn = props.isbn.trim();
    const title = props.title.trim();
    const author = props.author.trim();

    if (!isbn) {
      throw new Error('ISBN is required');
    }
    if (!title) {
      throw new Error('Title is required');
    }
    if (!author) {
      throw new Error('Author is required');
    }

    if (props.publishYear !== undefined) {
      const currentYear = new Date().getFullYear();
      if (props.publishYear < 1450 || props.publishYear > currentYear) {
        throw new Error('Invalid publish year');
      }
    }

    this.isbn = isbn;
    this.title = title;
    this.author = author;
    this.condition = props.condition;
    this.coverImageUrl = props.coverImageUrl;
    this.publisher = props.publisher?.trim();
    this.publishYear = props.publishYear;
    this.description = props.description?.trim();
  }
}
