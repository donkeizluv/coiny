/* eslint-disable no-debugger */
/* eslint-disable no-console */
import Vue from "vue";
import Vuex from "vuex";
import Axios from "axios";

Vue.use(Vuex);
const configStoreName = "coiny_config";
// const masterRatesStoreName = "coiny_rates";
const coinListStoreName = "coin_list";
const tokenInfoStoreName = "coiny_tokenInfo";

export default new Vuex.Store({
  state: {
    loading: false,
    running: false,
    lastError: null,
    lastLog: null,
    isConfigValid: false,
    // masterRates: null,
    coinList: [],
    // config
    apiKey: null,
    walletAddress: null,
    txInterval: null,
    coinListInterval: null,
    minValue: null,
    // api
    coinListApi: "https://api.coingecko.com/api/v3/coins/list",
    getPriceApi:
      "https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd",
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
    coinList: s => s.coinList,
    txInterval: s => s.txInterval || 999,
    minValue: s => s.minValue,
    coinListInterval: s => s.coinListInterval || 120000,
    apiKey: s => s.apiKey,
    walletAddress: s => s.walletAddress,
    maxBlockHeight: s => s.maxBlockHeight,
    // masterPriceApi: s => s.masterPriceApi,
    getPriceApi: s => s.getPriceApi,
    coinListApi: s => s.coinListApi,
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
      s.coinListInterval = v.coinListInterval;
      s.minValue = v.minValue;
      s.walletAddress = v.walletAddress;
    },
    COIN_LIST: (s, v) => {
      s.coinList = v;
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
    REFRESH_COIN_LIST: async ({ commit, getters, dispatch }) => {
      let cachedCoins = localStorage.getItem(coinListStoreName);
      if (cachedCoins) {
        let coins = JSON.parse(cachedCoins);
        if (coins.age + getters.coinListInterval > Date.now()) {
          // still good
          commit("COIN_LIST", coins.data);
        } else {
          // stale, fetch new
          coins = await dispatch("FETCH_COIN_LIST");
          dispatch("CACHE_COIN_LIST", coins);
          commit("COIN_LIST", coins);
        }
      } else {
        let coins = await dispatch("FETCH_COIN_LIST");
        dispatch("CACHE_COIN_LIST", coins);
        commit("COIN_LIST", coins);
      }
    },
    CACHE_COIN_LIST: (s, p) => {
      // console.log("master_rates: cache new rates...");
      localStorage.setItem(
        coinListStoreName,
        JSON.stringify({
          age: Date.now(),
          data: p
        })
      );
    },
    FETCH_COIN_LIST: async ({ state }) => {
      state.lastLog = "Downloading coin list";
      let { data } = await Axios.get(state.coinListApi);
      return data;
    },
    // TODO: cache this
    GET_PRICE_BY_SYMBOL: async ({ state }, p) => {
      if (!p) return null;
      let coin = state.coinList.find(
        c => c.symbol.toUpperCase() === p.toUpperCase()
      );
      // console.log(coin);
      // could not get coin info
      if (!coin) {
        state.lastLog = `Could not id of symbol: ${p}`;
        return null;
      }
      let { data } = await Axios.get(
        state.getPriceApi.replace("{ids}", coin.id)
      );
      // console.log(data);
      if (data.hasOwnProperty(coin.id)) return data[coin.id];
      return null;
    },
    REFRESH_MAX_BLOCK_HEIGHT: async ({ commit, getters }) => {
      let { data } = await Axios.get(
        getters.blockHeightApi.replace("{key}", getters.apiKey)
      );
      let newHeight = parseInt(data.result, 16);

      //{"jsonrpc":"2.0","id":83,"result":"0x65e1cb"}
      // if (!state.minBlockHeight) {
      //   commit("MIN_BLOCK_HEIGHT", newHeight);
      // }
      if (getters.maxBlockHeight != newHeight) {
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
      state.coinListInterval = 120000;
      state.minValue = 5000;
      state.isConfigValid = true;
      state.lastLog = "Loaded default config";
    }
  }
});
