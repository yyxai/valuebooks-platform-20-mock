import { describe, it, expect } from 'vitest';
import { Carrier } from './Carrier.js';

describe('Carrier', () => {
  it('should have Japan domestic carriers', () => {
    expect(Carrier.Yamato).toBe('yamato');
    expect(Carrier.Sagawa).toBe('sagawa');
    expect(Carrier.JapanPost).toBe('japan_post');
  });
});
