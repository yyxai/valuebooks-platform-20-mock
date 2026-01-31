import { Hono } from 'hono';
import { AppraisalService } from '../services/AppraisalService.js';
import { Condition } from '../domain/AppraisedBook.js';

export function createAppraisalRoutes(service: AppraisalService) {
  const app = new Hono();

  app.post('/', async (c) => {
    const { purchaseRequestId } = await c.req.json();
    const appraisal = await service.create(purchaseRequestId);
    return c.json(appraisal, 201);
  });

  app.get('/:id', async (c) => {
    const appraisal = await service.getById(c.req.param('id'));
    if (!appraisal) {
      return c.json({ error: 'Appraisal not found' }, 404);
    }
    return c.json(appraisal);
  });

  app.post('/:id/books', async (c) => {
    const { isbn, condition } = await c.req.json();
    const appraisal = await service.addBook(
      c.req.param('id'),
      isbn,
      condition as Condition
    );
    return c.json(appraisal);
  });

  app.delete('/:id/books/:isbn', async (c) => {
    const appraisal = await service.removeBook(
      c.req.param('id'),
      c.req.param('isbn')
    );
    return c.json(appraisal);
  });

  app.post('/:id/complete', async (c) => {
    const appraisal = await service.complete(c.req.param('id'));
    return c.json(appraisal);
  });

  return app;
}
