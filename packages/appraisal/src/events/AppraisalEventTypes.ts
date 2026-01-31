export const AppraisalEventTypes = {
  COMPLETED: 'appraisal.completed',
} as const;

export interface AppraisalCompletedPayload {
  appraisalId: string;
  purchaseRequestId: string;
  totalOffer: number;
  bookCount: number;
}
