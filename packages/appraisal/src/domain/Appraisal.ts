import { AppraisedBook } from './AppraisedBook.js';

export enum AppraisalStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export class Appraisal {
  public status: AppraisalStatus = AppraisalStatus.Pending;
  public books: AppraisedBook[] = [];
  public completedAt: Date | null = null;

  constructor(
    public readonly id: string,
    public readonly purchaseRequestId: string
  ) {}

  get totalOffer(): number {
    return this.books.reduce((sum, book) => sum + book.offerPrice, 0);
  }

  addBook(book: AppraisedBook): void {
    this.books.push(book);
    if (this.status === AppraisalStatus.Pending) {
      this.status = AppraisalStatus.InProgress;
    }
  }

  removeBook(isbn: string): void {
    this.books = this.books.filter((book) => book.isbn !== isbn);
  }

  complete(): void {
    if (this.books.length === 0) {
      throw new Error('Cannot complete appraisal with no books');
    }
    this.status = AppraisalStatus.Completed;
    this.completedAt = new Date();
  }
}
