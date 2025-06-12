import { call, put, takeLatest, all } from 'redux-saga/effects';
import {
  fetchProductsStart,
  fetchNextPage,
  fetchDigitalSuccess,
  fetchConsoleCardSuccess,
  fetchProductsFailure,
  fetchDummySuccess,
} from './productsSlice';
import { DigitalProduct, ConsoleCardProduct, DummyProduct, ProductsResponse } from './types';
import axios from 'axios';
import { SagaIterator } from 'redux-saga';

function fetchDigitalApi(page: number) {
  return axios.get<ProductsResponse<DigitalProduct>>(
    `http://localhost:3000/products/digital?page=${page}&itemsPerPage=10`
  );
}

function fetchConsoleCardApi(page: number) {
  return axios.get<ProductsResponse<ConsoleCardProduct>>(
    `http://localhost:3000/products/console-card?page=${page}&itemsPerPage=10`
  );
}

function fetchDummyApi(page: number) {
  return axios.get<ProductsResponse<DummyProduct>>(
    `http://localhost:3000/products/dummy-card?page=${page}&itemsPerPage=10`
  );
}

function* fetchProductsSaga(action: ReturnType<typeof fetchProductsStart> | ReturnType<typeof fetchNextPage>): SagaIterator {
  try {
    const { type, page } = action.payload;
    if (type === 'digital') {
      const res = yield call(fetchDigitalApi, page);
      const hasMore = res.data.data.length > 0;
      yield put(fetchDigitalSuccess({ data: res.data.data, page, hasMore }));
    } else if (type === "consoleCard") {
      const res = yield call(fetchConsoleCardApi, page);
      const hasMore = res.data.data.length > 0;
      yield put(fetchConsoleCardSuccess({ data: res.data.data, page, hasMore }));
    } else if (type === "dummy") {
      const res = yield call(fetchDummyApi, page);
      const hasMore = res.data.data.length > 0;
      yield put(fetchDummySuccess({ data: res.data.data, page, hasMore }));
    }
  } catch (e: any) {
    yield put(fetchProductsFailure(e.message || 'Failed to load games'));
  }
}

function* watchFetchProducts() {
  yield takeLatest(fetchProductsStart.type, fetchProductsSaga);
  yield takeLatest(fetchNextPage.type, fetchProductsSaga);
}

export default function* rootSaga() {
  yield all([
    watchFetchProducts(),
  ]);
} 