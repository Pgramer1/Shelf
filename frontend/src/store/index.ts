import { configureStore } from '@reduxjs/toolkit';
import collectionFiltersReducer, { persistCollectionFiltersState } from './collectionFiltersSlice';

export const store = configureStore({
  reducer: {
    collectionFilters: collectionFiltersReducer,
  },
});

let previousCollectionFilters = store.getState().collectionFilters;

store.subscribe(() => {
  const nextCollectionFilters = store.getState().collectionFilters;
  if (nextCollectionFilters === previousCollectionFilters) {
    return;
  }

  previousCollectionFilters = nextCollectionFilters;
  persistCollectionFiltersState(nextCollectionFilters);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
