import { BookCondition } from './BookCondition.js';

export type SortOption =
  | 'price_asc'
  | 'price_desc'
  | 'date_newest'
  | 'date_oldest'
  | 'title';

export interface SearchCriteria {
  q?: string;
  conditions?: BookCondition[];
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
