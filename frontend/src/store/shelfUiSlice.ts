import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ShelfActiveSection = 'collection' | 'insights';
export type MobileCollectionViewMode = 'single' | 'double' | 'list';
export type DesktopCollectionViewMode = 'cards' | 'list';

export interface ShelfUiState {
  activeSection: ShelfActiveSection;
  searchQuery: string;
  isSidebarOpen: boolean;
  mobileCollectionViewMode: MobileCollectionViewMode;
  desktopCollectionViewMode: DesktopCollectionViewMode;
}

const SHELF_UI_STORAGE_KEY = 'shelf.ui.v1';

const DEFAULT_SHELF_UI_STATE: ShelfUiState = {
  activeSection: 'collection',
  searchQuery: '',
  isSidebarOpen: true,
  mobileCollectionViewMode: 'single',
  desktopCollectionViewMode: 'cards',
};

const loadShelfUiState = (): ShelfUiState => {
  if (typeof window === 'undefined') {
    return DEFAULT_SHELF_UI_STATE;
  }

  try {
    const raw = window.localStorage.getItem(SHELF_UI_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SHELF_UI_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<ShelfUiState>;

    const activeSection = parsed.activeSection === 'collection' || parsed.activeSection === 'insights'
      ? parsed.activeSection
      : DEFAULT_SHELF_UI_STATE.activeSection;

    const searchQuery = typeof parsed.searchQuery === 'string'
      ? parsed.searchQuery
      : DEFAULT_SHELF_UI_STATE.searchQuery;

    const isSidebarOpen = typeof parsed.isSidebarOpen === 'boolean'
      ? parsed.isSidebarOpen
      : DEFAULT_SHELF_UI_STATE.isSidebarOpen;

    const mobileCollectionViewMode =
      parsed.mobileCollectionViewMode === 'single'
      || parsed.mobileCollectionViewMode === 'double'
      || parsed.mobileCollectionViewMode === 'list'
        ? parsed.mobileCollectionViewMode
        : DEFAULT_SHELF_UI_STATE.mobileCollectionViewMode;

    const desktopCollectionViewMode =
      parsed.desktopCollectionViewMode === 'cards' || parsed.desktopCollectionViewMode === 'list'
        ? parsed.desktopCollectionViewMode
        : DEFAULT_SHELF_UI_STATE.desktopCollectionViewMode;

    return {
      activeSection,
      searchQuery,
      isSidebarOpen,
      mobileCollectionViewMode,
      desktopCollectionViewMode,
    };
  } catch {
    return DEFAULT_SHELF_UI_STATE;
  }
};

export const persistShelfUiState = (state: ShelfUiState) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SHELF_UI_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures (private mode/quota/full storage).
  }
};

const initialState: ShelfUiState = loadShelfUiState();

const shelfUiSlice = createSlice({
  name: 'shelfUi',
  initialState,
  reducers: {
    setShelfActiveSection(state, action: PayloadAction<ShelfActiveSection>) {
      state.activeSection = action.payload;
    },
    setShelfSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setShelfSidebarOpen(state, action: PayloadAction<boolean>) {
      state.isSidebarOpen = action.payload;
    },
    setShelfMobileCollectionViewMode(state, action: PayloadAction<MobileCollectionViewMode>) {
      state.mobileCollectionViewMode = action.payload;
    },
    setShelfDesktopCollectionViewMode(state, action: PayloadAction<DesktopCollectionViewMode>) {
      state.desktopCollectionViewMode = action.payload;
    },
    resetShelfUiState() {
      return DEFAULT_SHELF_UI_STATE;
    },
  },
});

export const {
  setShelfActiveSection,
  setShelfSearchQuery,
  setShelfSidebarOpen,
  setShelfMobileCollectionViewMode,
  setShelfDesktopCollectionViewMode,
  resetShelfUiState,
} = shelfUiSlice.actions;

export default shelfUiSlice.reducer;
