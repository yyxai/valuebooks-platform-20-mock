import { describe, it, expect } from 'vitest';
import { Carrier } from './Carrier.js';
import { TrackingUrlGenerator } from './TrackingUrlGenerator.js';

describe('TrackingUrlGenerator', () => {
  it('should generate Yamato tracking URL', () => {
    const url = TrackingUrlGenerator.generate(Carrier.Yamato, '1234567890');
    expect(url).toBe(
      'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=1234567890'
    );
  });

  it('should generate Sagawa tracking URL', () => {
    const url = TrackingUrlGenerator.generate(Carrier.Sagawa, '9876543210');
    expect(url).toBe(
      'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=9876543210'
    );
  });

  it('should generate Japan Post tracking URL', () => {
    const url = TrackingUrlGenerator.generate(Carrier.JapanPost, '1122334455');
    expect(url).toBe(
      'https://trackings.post.japanpost.jp/services/srv/search?requestNo1=1122334455'
    );
  });
});
