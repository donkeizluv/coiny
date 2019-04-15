/* eslint-disable no-console */
import Axios from "axios";
// import queryString from "query-string";

const exchangeInfoStoreName = "coiny_ExchangeInfo";
const bRequestWeightName = "REQUEST_WEIGHT";
// initial state
const state = {
  useProxy: true,
  api: {
    exchangeInfo: "/api/v1/exchangeInfo",
    avgPrice: "/api/v3/avgPrice",
    price: "/api/v3/ticker/price"
  },
  endPoint: "https://api.binance.com",

  // interval related settings
  intervals: {
    price: {
      rate: 1666
    },
    exchangeInfo: {
      rate: 1000 * 60 * 60 * 6 // 6 hours
    }
  },
  // master rates
  rates: [],
  // exchange regulation
  // TODO: throttle
  exchangeInfo: {
    requestWeight: null,
    bSymbols: [],
    expire: 0
  },
  alarms: [
    // { symbol: "XXX", up: true, price: 0.1, at: new Date().toLocaleTimeString() },
    // { symbol: "24234", up: false, price: 111, at: new Date().toLocaleTimeString() }
  ]
};

// getters
const getters = {
  useProxy: s => s.useProxy,
  endPoint: s => s.endPoint,
  api: s => s.api,
  exchangeInfo: s => s.exchangeInfo,
  intervals: s => s.intervals,
  alarms: s => s.alarms || []
};

// actions
const actions = {
  BUILD_API: ({ getters, rootGetters }, p) => {
    if (getters.useProxy) {
      return `${rootGetters.proxyPath}${getters.endPoint}${p}`;
    } else {
      return `${getters.endPoint}${p}`;
    }
  },
  GET_EXCHANGE_INFO: async ({ dispatch, getters }) => {
    let { data } = await Axios.get(
      await dispatch("BUILD_API", getters.api.exchangeInfo)
    );
    return data;
  },
  GET_RATE: async ({ dispatch, getters }) => {
    let { data } = await Axios.get(
      await dispatch("BUILD_API", getters.api.price)
    );
    return data;
  },
  REFRESH_EXCHANGE_INFO: async ({ commit, getters, dispatch }) => {
    let exchangeInfo = getters.exchangeInfo;
    let exchangeInfoIntervals = getters.intervals.exchangeInfo;
    if (
      exchangeInfo.bSymbols.length > 0 &&
      exchangeInfo.requestWeight &&
      exchangeInfo.expire > Date.now()
    ) {
      // console.log("still fresh");
      return;
    }
    // check cache
    let cache = localStorage.getItem(exchangeInfoStoreName);
    if (cache) {
      let info = JSON.parse(cache);
      if (info.expire > Date.now()) {
        // still good -> reuse
        // console.log("reuse exchangeInfo");
        commit("SET_EXCHANGE", { data: info.data, expire: info.expire });
        return;
      }
    }
    // not exists or stale -> fetch new
    // console.log("fetch new exchangeInfo");
    let info = await dispatch("GET_EXCHANGE_INFO");
    let newInfo = {
      name: exchangeInfoStoreName,
      data: info,
      expire: new Date().getTime() + exchangeInfoIntervals.rate
    };
    dispatch("CACHE", newInfo, { root: true });
    commit("SET_EXCHANGE", newInfo);
  },
  CLEAR_ALARMS: async ({ commit }) => {
    commit("ALARMS", null);
  },
  ALARM: async ({ commit }, p) => {
    commit("ALARMS", p);
  }
};

// mutations
const mutations = {
  SET_EXCHANGE(state, payload) {
    // no need to store everything
    // state.exchangeInfo = info;
    state.exchangeInfo.requestWeight = payload.data.rateLimits.find(
      i => i.rateLimitType === bRequestWeightName
    );
    state.exchangeInfo.bSymbols = payload.data.symbols
      .filter(s => s.status === "TRADING")
      .map(i => {
        return {
          symbol: i.symbol,
          baseAsset: i.baseAsset,
          baseAssetPrecision: i.baseAssetPrecision,
          quoteAsset: i.quoteAsset,
          quotePrecision: i.quotePrecision
        };
      });
    state.exchangeInfo.expire = payload.expire;
  },
  ALARMS(state, alarm) {
    if (alarm) state.alarms.push(alarm);
    else state.alarms = [];
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
