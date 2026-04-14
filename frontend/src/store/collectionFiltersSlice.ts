import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type CollectionSortOption =
  | 'UPDATED_DESC'
  | 'UPDATED_ASC'
  | 'RATING_DESC'
  | 'RATING_ASC'
  | 'TITLE_ASC'
  | 'PROGRESS_DESC';

export interface CollectionFiltersState {
  activeType: string;
  activeStatus: string;
  sortBy: CollectionSortOption;
}

const COLLECTION_FILTERS_STORAGE_KEY = 'shelf.collectionFilters.v1';

const DEFAULT_COLLECTION_FILTERS_STATE: CollectionFiltersState = {
  activeType: 'ALL',
  activeStatus: 'ALL',
  sortBy: 'UPDATED_DESC',
};

const validSortOptions = new Set<CollectionSortOption>([
  'UPDATED_DESC',
  'UPDATED_ASC',
  'RATING_DESC',
  'RATING_ASC',
  'TITLE_ASC',
  'PROGRESS_DESC',
]);

const loadCollectionFiltersState = (): CollectionFiltersState => {
  if (typeof window === 'undefined') {
    return DEFAULT_COLLECTION_FILTERS_STATE;
  }

  try {
    const raw = window.localStorage.getItem(COLLECTION_FILTERS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_COLLECTION_FILTERS_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<CollectionFiltersState>;
    const activeType = typeof parsed.activeType === 'string' ? parsed.activeType : DEFAULT_COLLECTION_FILTERS_STATE.activeType;
    const activeStatus = typeof parsed.activeStatus === 'string' ? parsed.activeStatus : DEFAULT_COLLECTION_FILTERS_STATE.activeStatus;
    const sortBy = validSortOptions.has(parsed.sortBy as CollectionSortOption)
      ? (parsed.sortBy as CollectionSortOption)
      : DEFAULT_COLLECTION_FILTERS_STATE.sortBy;

    return {
      activeType,
      activeStatus,
      sortBy,
    };
  } catch {
    return DEFAULT_COLLECTION_FILTERS_STATE;
  }
};

export const persistCollectionFiltersState = (state: CollectionFiltersState) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(COLLECTION_FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures (private mode/quota/full storage).
  }
};

const initialState: CollectionFiltersState = loadCollectionFiltersState();

const collectionFiltersSlice = createSlice({
  name: 'collectionFilters',
  initialState,
  reducers: {
    setActiveType(state, action: PayloadAction<string>) {
      state.activeType = action.payload;
      state.activeStatus = 'ALL';
    },
    setActiveStatus(state, action: PayloadAction<string>) {
      state.activeStatus = action.payload;
    },
    setSortBy(state, action: PayloadAction<CollectionSortOption>) {
      state.sortBy = action.payload;
    },
    resetCollectionFilters() {
      return DEFAULT_COLLECTION_FILTERS_STATE;
    },
  },
});

export const { setActiveType, setActiveStatus, setSortBy, resetCollectionFilters } = collectionFiltersSlice.actions;

export default collectionFiltersSlice.reducer;
