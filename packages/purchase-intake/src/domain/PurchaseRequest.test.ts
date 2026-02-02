import { describe, it, expect } from 'vitest';
import { PurchaseRequest } from './PurchaseRequest.js';
import { PurchaseRequestStatus } from './PurchaseRequestStatus.js';
import { BoxDescription, BookCategory, BookCondition } from './BoxDescription.js';
import { Estimate } from './Estimate.js';

describe('PurchaseRequest', () => {
  const customer = {
    email: 'test@example.com',
    name: 'テストユーザー',
    phone: '090-1234-5678',
    address: {
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '丸の内1-1-1',
    },
  };
  const boxDescription = new BoxDescription(20, BookCategory.Fiction, BookCondition.Good);

  it('should create a draft purchase request', () => {
    const request = PurchaseRequest.create(customer, boxDescription);

    expect(request.status).toBe(PurchaseRequestStatus.Draft);
    expect(request.customer).toEqual(customer);
    expect(request.boxDescription).toEqual(boxDescription);
  });

  it('should submit with estimate', () => {
    const request = PurchaseRequest.create(customer, boxDescription);
    const estimate = new Estimate(25, 40);

    request.submit(estimate, 'TRACK123', 'https://label.pdf');

    expect(request.status).toBe(PurchaseRequestStatus.Submitted);
    expect(request.estimate).toEqual(estimate);
    expect(request.shipment?.trackingNumber).toBe('TRACK123');
  });

  it('should not submit if already submitted', () => {
    const request = PurchaseRequest.create(customer, boxDescription);
    request.submit(new Estimate(25, 40), 'TRACK123', 'https://label.pdf');

    expect(() => request.submit(new Estimate(30, 50), 'TRACK456', 'https://label2.pdf'))
      .toThrow('Cannot submit: current status is submitted');
  });
});
