'use client';

import { cn } from '@/lib/utils';

interface SokufuriSelectorProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function SokufuriSelector({ value, onChange }: SokufuriSelectorProps) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          'border rounded-lg p-4 cursor-pointer transition-colors',
          !value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        )}
        onClick={() => onChange(false)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
              !value ? 'border-blue-500' : 'border-gray-300'
            )}
          >
            {!value && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
          </div>
          <div>
            <p className="font-medium">通常買取</p>
            <p className="text-sm text-gray-600">査定 → 確認 → 入金</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'border rounded-lg p-4 cursor-pointer transition-colors',
          value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        )}
        onClick={() => onChange(true)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
              value ? 'border-blue-500' : 'border-gray-300'
            )}
          >
            {value && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
          </div>
          <div className="flex-1">
            <p className="font-medium">ソクフリ買取</p>
            <p className="text-sm text-gray-600">査定 → 即入金</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                ✓ 査定額+20%（ポイント付与）
              </span>
              <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                ✓ 最短翌日入金
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
