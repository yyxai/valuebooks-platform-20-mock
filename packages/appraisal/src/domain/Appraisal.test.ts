import { describe, it, expect } from 'vitest';
import { Appraisal, AppraisalStatus } from './Appraisal.js';
import { AppraisedBook, Condition } from './AppraisedBook.js';

describe('Appraisal', () => {
  it('creates with pending status and empty books', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');

    expect(appraisal.id).toBe('appr-1');
    expect(appraisal.purchaseRequestId).toBe('pr-123');
    expect(appraisal.status).toBe(AppraisalStatus.Pending);
    expect(appraisal.books).toEqual([]);
    expect(appraisal.totalOffer).toBe(0);
  });

  it('adds book and updates total offer', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');
    const book = new AppraisedBook('isbn-1', 'Title', 'Author', Condition.Good, 10);

    appraisal.addBook(book);

    expect(appraisal.books).toHaveLength(1);
    expect(appraisal.totalOffer).toBe(6.00);
    expect(appraisal.status).toBe(AppraisalStatus.InProgress);
  });

  it('removes book by ISBN', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');
    appraisal.addBook(new AppraisedBook('isbn-1', 'Title1', 'Author1', Condition.Good, 10));
    appraisal.addBook(new AppraisedBook('isbn-2', 'Title2', 'Author2', Condition.Fair, 10));

    appraisal.removeBook('isbn-1');

    expect(appraisal.books).toHaveLength(1);
    expect(appraisal.books[0].isbn).toBe('isbn-2');
    expect(appraisal.totalOffer).toBe(4.00);
  });

  it('completes appraisal', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');
    appraisal.addBook(new AppraisedBook('isbn-1', 'Title', 'Author', Condition.Good, 10));

    appraisal.complete();

    expect(appraisal.status).toBe(AppraisalStatus.Completed);
    expect(appraisal.completedAt).toBeInstanceOf(Date);
  });

  it('throws when completing empty appraisal', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');

    expect(() => appraisal.complete()).toThrow('Cannot complete appraisal with no books');
  });
});
