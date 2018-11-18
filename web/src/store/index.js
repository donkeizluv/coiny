/* eslint-disable no-debugger */
/* eslint-disable no-console */
import Vue from "vue";
import Vuex from "vuex";
import Axios from "axios";

Vue.use(Vuex);
const configStoreName = "coiny_config";
const masterRatesStoreName = "coiny_rates";
const tokenInfoStoreName = "coiny_tokenInfo";

export default new Vuex.Store({
  state: {
    loading: false,
    running: false,
    lastError: null,
    lastLog: null,
    isConfigValid: false,
    masterRates: null,
    // config
    apiKey: null,
    walletAddress: null,
    txInterval: null,
    ratesInterval: null,
    minValue: null,
    // api
    masterPriceApi:
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd",
    blockHeightApi:
      "https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey={key}",
    txByAddressApi:
      "http://api.etherscan.io/api?module=account&action=tokentx&address={address}&startblock={start}&endblock={end}&sort=asc&apikey={key}",
    readContractApi:
      "http://api.ethplorer.io/getTokenInfo/{address}?apiKey=freekey",
    openTxUrl: "https://etherscan.io/tx/{hash}",
    maxBlockHeight: 0
  },
  getters: {
    loading: s => s.loading,
    running: s => s.running,
    lastError: s => s.lastError,
    lastLog: s => s.lastLog,
    isConfigValid: s => s.isConfigValid,
    masterRates: s => s.masterRates,
    txInterval: s => s.txInterval || 999,
    minValue: s => s.minValue,
    ratesInterval: s => s.ratesInterval || 2222,
    apiKey: s => s.apiKey,
    walletAddress: s => s.walletAddress,
    maxBlockHeight: s => s.maxBlockHeight,
    masterPriceApi: s => s.masterPriceApi,
    blockHeightApi: s => s.blockHeightApi,
    txByAddressApi: s => s.txByAddressApi,
    readContractApi: s => s.readContractApi,
    openTxUrl: s => s.openTxUrl
  },
  mutations: {
    LOADING: (s, v) => {
      s.loading = v;
    },
    IS_CONFIG_VALID: (s, v) => {
      s.isConfigValid = v;
    },
    CONFIG: (s, v) => {
      s.apiKey = v.apiKey;
      s.txInterval = v.txInterval;
      s.ratesInterval = v.ratesInterval;
      s.minValue = v.minValue;
      s.walletAddress = v.walletAddress;
    },
    MASTER_RATES: (s, v) => {
      s.masterRates = v;
    },
    MAX_BLOCK_HEIGHT: (s, v) => {
      s.maxBlockHeight = v;
    },
    // MIN_BLOCK_HEIGHT: (s, v) => {
    //   s.minBlockHeight = v;
    // },
    RUNNING: (s, v) => {
      s.running = v;
    }
  },
  actions: {
    INIT: async ({ dispatch }) => {
      dispatch("LOAD_CONFIG");
    },
    RUNNING: ({ commit }, p) => {
      commit("RUNNING", p);
    },
    REFRESH_MASTER_RATES: async ({ commit, state, dispatch }) => {
      let cachedRates = localStorage.getItem(masterRatesStoreName);
      if (cachedRates) {
        let rates = JSON.parse(cachedRates);
        if (rates.age + state.ratesInterval > Date.now()) {
          // still good
          commit("MASTER_RATES", rates.data);
        } else {
          // stale, fetch new
          rates = await dispatch("FETCH_MASTER_RATES");
          dispatch("CACHE_MASTER_RATES", rates);
          commit("MASTER_RATES", rates);
        }
      } else {
        let rates = await dispatch("FETCH_MASTER_RATES");
        dispatch("CACHE_MASTER_RATES", rates);
        commit("MASTER_RATES", rates);
      }
    },
    CACHE_MASTER_RATES: (s, p) => {
      // console.log("master_rates: cache new rates...");
      localStorage.setItem(
        masterRatesStoreName,
        JSON.stringify({
          age: Date.now(),
          data: p
        })
      );
    },
    FETCH_MASTER_RATES: async ({ state }) => {
      state.lastLog = "Refreshing master rates";
      let { data } = await Axios.get(state.masterPriceApi);
      return data;
    },
    REFRESH_MAX_BLOCK_HEIGHT: async ({ commit, state }) => {
      let { data } = await Axios.get(
        state.blockHeightApi.replace("{key}", state.apiKey)
      );
      let newHeight = parseInt(data.result, 16);

      //{"jsonrpc":"2.0","id":83,"result":"0x65e1cb"}
      // if (!state.minBlockHeight) {
      //   commit("MIN_BLOCK_HEIGHT", newHeight);
      // }
      if (state.maxBlockHeight != newHeight) {
        // commit change
        commit("MAX_BLOCK_HEIGHT", newHeight);
        return true;
      }
      // no changes
      return false;
    },
    GET_TX: async ({ state }, p) => {
      if (!p) throw new Error("invalid payload");
      let api = state.txByAddressApi
        .replace("{address}", state.walletAddress)
        .replace("{start}", p.min)
        .replace("{end}", p.max)
        .replace("{key}", state.apiKey);
      let { data } = await Axios.get(api);
      return data;
    },
    FETCH_CONTRACT: async ({ state }, p) => {
      let { data } = await Axios.get(
        state.readContractApi.replace("{address}", p)
      );
      return data;
    },
    GET_CONTRACT: async ({ dispatch }, p) => {
      let tokenCached = localStorage.getItem(tokenInfoStoreName);
      if (tokenCached) {
        console.log("token info: cache found");
        tokenCached = JSON.parse(tokenCached);
        let token = tokenCached.find(t => t.address === p);
        if (token) {
          console.log("token info: cached token found");
          return token;
        }
        // fetch token info
        console.log("token info: no cached token found");
        let data = await dispatch("FETCH_CONTRACT", p);
        if (data.error) return null;
        token = { decimal: data.decimals, symbol: data.symbol, address: p };
        // cache
        tokenCached.push(token);
        localStorage.setItem(tokenInfoStoreName, JSON.stringify(tokenCached));
        return token;
      }
      // create new token cache
      console.log("token info: no cache found");
      tokenCached = [];
      let data = await dispatch("FETCH_CONTRACT", p);
      if (data.error) return null;
      let token = { decimal: data.decimals, symbol: data.symbol, address: p };
      tokenCached.push(token);
      localStorage.setItem(tokenInfoStoreName, JSON.stringify(tokenCached));
      return token;
    },
    ALERT: async (s, p) => {
      await Axios.post("/alert", {
        symbol: p.symbol,
        value: p.value,
        hash: p.txHash
      });
    },
    LOAD_CONFIG: ({ dispatch, state }) => {
      let config = localStorage.getItem(configStoreName);
      if (config) {
        config = JSON.parse(config);
        if (dispatch("UPDATE_CONFIG", config)) {
          state.isConfigValid = true;
          return true;
        }
        return false;
      }
      return false;
    },
    UPDATE_CONFIG: ({ commit, dispatch, state }, p) => {
      if (!p) throw new Error("Invalid payload.");
      // check config
      commit("CONFIG", p);
      dispatch("SAVE_CONFIG", p);
      state.isConfigValid = true;
      return true;
    },
    SAVE_CONFIG: (s, p) => {
      localStorage.setItem(configStoreName, JSON.stringify(p));
    },
    LOAD_DEFAULT_CONFIG: ({ state }) => {
      state.apiKey = "NF1F9V7CVRW69M9G51SEZXB2DYCR387VZ4";
      state.walletAddress = "0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208";
      state.txInterval = 6666;
      state.ratesInterval = 10000;
      state.minValue = 5000;
      state.isConfigValid = true;
      state.lastLog = "Loaded default config";
    }
  }
});
