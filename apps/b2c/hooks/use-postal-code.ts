'use client';

import { useState, useCallback } from 'react';

interface PostalCodeResult {
  prefecture: string;
  city: string;
}

export function usePostalCode() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (postalCode: string): Promise<PostalCodeResult | null> => {
    // Remove hyphens and validate format
    const cleaned = postalCode.replace(/-/g, '');
    if (!/^\d{7}$/.test(cleaned)) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          prefecture: result.address1,
          city: result.address2 + result.address3,
        };
      } else {
        setError('郵便番号が見つかりませんでした');
        return null;
      }
    } catch {
      setError('住所の取得に失敗しました');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { lookup, isLoading, error };
}
