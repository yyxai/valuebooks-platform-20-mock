import { EventBus } from '@valuebooks/shared';
import { Appraisal } from '../domain/Appraisal.js';
import { AppraisedBook, Condition } from '../domain/AppraisedBook.js';
import { BookLookupService } from '../infrastructure/BookLookupService.js';

export class AppraisalService {
  private appraisals: Map<string, Appraisal> = new Map();

  constructor(
    private eventBus: EventBus,
    private bookLookup: BookLookupService
  ) {}

  async create(purchaseRequestId: string): Promise<Appraisal> {
    const id = `appr-${Date.now()}`;
    const appraisal = new Appraisal(id, purchaseRequestId);
    this.appraisals.set(id, appraisal);
    return appraisal;
  }

  async addBook(appraisalId: string, isbn: string, condition: Condition): Promise<Appraisal> {
    const appraisal = this.appraisals.get(appraisalId);
    if (!appraisal) {
      throw new Error('Appraisal not found');
    }

    const bookInfo = await this.bookLookup.lookupByIsbn(isbn);
    if (!bookInfo) {
      throw new Error('Book not found');
    }

    const book = new AppraisedBook(
      isbn,
      bookInfo.title,
      bookInfo.author,
      condition,
      bookInfo.basePrice
    );

    appraisal.addBook(book);
    return appraisal;
  }

  async removeBook(appraisalId: string, isbn: string): Promise<Appraisal> {
    const appraisal = this.appraisals.get(appraisalId);
    if (!appraisal) {
      throw new Error('Appraisal not found');
    }

    appraisal.removeBook(isbn);
    return appraisal;
  }

  async complete(appraisalId: string): Promise<Appraisal> {
    const appraisal = this.appraisals.get(appraisalId);
    if (!appraisal) {
      throw new Error('Appraisal not found');
    }

    appraisal.complete();

    this.eventBus.publish({
      type: 'appraisal.completed',
      payload: {
        appraisalId: appraisal.id,
        purchaseRequestId: appraisal.purchaseRequestId,
        totalOffer: appraisal.totalOffer,
        bookCount: appraisal.books.length,
      },
      timestamp: new Date(),
    });

    return appraisal;
  }

  async getById(appraisalId: string): Promise<Appraisal | undefined> {
    return this.appraisals.get(appraisalId);
  }
}
