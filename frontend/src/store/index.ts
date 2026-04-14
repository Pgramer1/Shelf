import { configureStore } from '@reduxjs/toolkit';
import collectionFiltersReducer, { persistCollectionFiltersState } from './collectionFiltersSlice';
import shelfUiReducer, { persistShelfUiState } from './shelfUiSlice';

export const store = configureStore({
  reducer: {
    collectionFilters: collectionFiltersReducer,
    shelfUi: shelfUiReducer,
  },
});

let previousCollectionFilters = store.getState().collectionFilters;
let previousShelfUi = store.getState().shelfUi;

store.subscribe(() => {
  const state = store.getState();
  const nextCollectionFilters = state.collectionFilters;
  const nextShelfUi = state.shelfUi;

  if (nextCollectionFilters !== previousCollectionFilters) {
    previousCollectionFilters = nextCollectionFilters;
    persistCollectionFiltersState(nextCollectionFilters);
  }

  if (nextShelfUi !== previousShelfUi) {
    previousShelfUi = nextShelfUi;
    persistShelfUiState(nextShelfUi);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
