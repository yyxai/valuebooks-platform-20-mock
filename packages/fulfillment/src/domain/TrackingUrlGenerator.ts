import { Carrier } from './Carrier.js';

const TRACKING_URL_TEMPLATES: Record<Carrier, string> = {
  [Carrier.Yamato]: 'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number={trackingNumber}',
  [Carrier.Sagawa]: 'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo={trackingNumber}',
  [Carrier.JapanPost]: 'https://trackings.post.japanpost.jp/services/srv/search?requestNo1={trackingNumber}',
};

export class TrackingUrlGenerator {
  static generate(carrier: Carrier, trackingNumber: string): string {
    const template = TRACKING_URL_TEMPLATES[carrier];
    return template.replace('{trackingNumber}', trackingNumber);
  }
}
