import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProductsState, DigitalProduct, ConsoleCardProduct, DummyProduct } from './types';

const initialState: ProductsState = {
  digital: [],
  consoleCard: [],
  dummy: [],
  loading: false,
  error: null,
  digitalPage: 1,
  consoleCardPage: 1,
  dummyPage: 1,
  digitalHasMore: true,
  consoleCardHasMore: true,
  dummyHasMore: true,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    fetchProductsStart(state, action: PayloadAction<{ type: 'digital' | 'consoleCard' | 'dummy'; page: number }>) {
      state.loading = true;
      state.error = null;
      if (action.payload.type === 'digital' && action.payload.page === 1) {
        state.digital = [];
        state.digitalPage = 1;
        state.digitalHasMore = true;
      }
      if (action.payload.type === 'consoleCard' && action.payload.page === 1) {
        state.consoleCard = [];
        state.consoleCardPage = 1;
        state.consoleCardHasMore = true;
      }
      if (action.payload.type === 'dummy' && action.payload.page === 1) {
        state.dummy = [];
        state.dummyPage = 1;
        state.dummyHasMore = true;
      }
    },
    fetchNextPage(state, action: PayloadAction<{ type: 'digital' | 'consoleCard' | 'dummy'; page: number }>) {
      state.loading = true;
      state.error = null;
    },
    fetchDigitalSuccess(state, action: PayloadAction<{ data: DigitalProduct[]; page: number; hasMore: boolean }>) {
      if (action.payload.page === 1) {
        state.digital = action.payload.data;
      } else {
        state.digital = [...state.digital, ...action.payload.data];
      }
      state.digitalPage = action.payload.page;
      state.digitalHasMore = action.payload.hasMore;
      state.loading = false;
    },
    fetchConsoleCardSuccess(state, action: PayloadAction<{ data: ConsoleCardProduct[]; page: number; hasMore: boolean }>) {
      if (action.payload.page === 1) {
        state.consoleCard = action.payload.data;
      } else {
        state.consoleCard = [...state.consoleCard, ...action.payload.data];
      }
      state.consoleCardPage = action.payload.page;
      state.consoleCardHasMore = action.payload.hasMore;
      state.loading = false;
    },
    fetchDummySuccess(state, action: PayloadAction<{ data: DummyProduct[]; page: number; hasMore: boolean }>) {
      if (action.payload.page === 1) {
        state.dummy = action.payload.data;
      } else {
        state.dummy = [...state.consoleCard, ...action.payload.data];
      }
      state.dummyPage = action.payload.page;
      state.dummyHasMore = action.payload.hasMore;
      state.loading = false;
    },
    fetchProductsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  fetchProductsStart,
  fetchNextPage,
  fetchDigitalSuccess,
  fetchConsoleCardSuccess,
  fetchProductsFailure,
  fetchDummySuccess,
} = productsSlice.actions;

export default productsSlice.reducer; 