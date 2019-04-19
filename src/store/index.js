/* eslint-disable no-debugger */
/* eslint-disable no-console */
import Vue from "vue";
import Vuex from "vuex";
import Axios from "axios";

// modules
import alarm from "./modules/alarm";

Vue.use(Vuex);
const configStoreName = "coiny_config";
const coinListStoreName = "coin_list";
const tokenInfoStoreName = "coiny_tokenInfo";

export default new Vuex.Store({
  strict: true,
  modules: {
    alarm
  },
  state: {
    isProd: process.env.NODE_ENV === "production",
    // use self or remote proxy
    useSelfProxy: true,
    isDebug: false,
    loading: false,
    // running: false,
    lastError: null,
    lastLog: null,
    isConfigValid: false,
    coinList: [],
    coinListExpire: 0,
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
    maxBlockHeight: 0,
    proxyPathRemote: "http://localhost:3000/p",
    proxyPathSelf: "/p",
    proxyPathQuery: "url"
  },
  getters: {
    isProd: s => s.isProd,
    isDebug: s => s.isDebug,
    loading: s => s.loading,
    // running: s => s.running,
    lastError: s => s.lastError,
    lastLog: s => s.lastLog,
    isConfigValid: s => s.isConfigValid,
    coinList: s => s.coinList,
    coinListExpire: s => s.coinListExpire,
    txInterval: s => s.txInterval || 1111,
    minValue: s => s.minValue,
    coinListInterval: s => s.coinListInterval || 1000 * 60 * 2,
    apiKey: s => s.apiKey,
    walletAddress: s => s.walletAddress,
    maxBlockHeight: s => s.maxBlockHeight,
    // masterPriceApi: s => s.masterPriceApi,
    getPriceApi: s => s.getPriceApi,
    coinListApi: s => s.coinListApi,
    blockHeightApi: s => s.blockHeightApi,
    txByAddressApi: s => s.txByAddressApi,
    readContractApi: s => s.readContractApi,
    openTxUrl: s => s.openTxUrl,
    // return proxy path that is ready to use
    proxyPath: s =>
      `${s.useSelfProxy ? s.proxyPathSelf : s.proxyPathRemote}?${
        s.proxyPathQuery
      }=`
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
      s.coinList = v.data;
      s.coinListExpire = v.expire;
    },
    MAX_BLOCK_HEIGHT: (s, v) => {
      s.maxBlockHeight = v;
    },
    // MIN_BLOCK_HEIGHT: (s, v) => {
    //   s.minBlockHeight = v;
    // },
    // RUNNING: (s, v) => {
    //   s.running = v;
    // },
    DEFAULT_CONFIG: s => {
      s.apiKey = "NF1F9V7CVRW69M9G51SEZXB2DYCR387VZ4";
      s.walletAddress = "0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208";
      s.txInterval = 6666;
      s.coinListInterval = 120000;
      s.minValue = 5000;
      s.isConfigValid = true;
      s.lastLog = "Loaded default config";
    },
    LAST_LOG: (s, v) => {
      s.lastLog = v;
    },
    LAST_ERROR: (s, v) => {
      s.lastError = v;
    },
    DEBUG: (s, v) => {
      s.isDebug = v;
    }
  },
  actions: {
    INIT: async ({ dispatch }) => {
      dispatch("LOAD_CONFIG");
    },
    // RUNNING: ({ commit }, p) => {
    //   commit("RUNNING", p);
    // },
    REFRESH_COIN_LIST: async ({ commit, getters, dispatch }) => {
      if (getters.coinList.length > 0 && getters.coinListExpire > Date.now()) {
        // console.log("still fresh");
        return;
      }
      let cachedCoins = localStorage.getItem(coinListStoreName);
      if (cachedCoins) {
        let coins = JSON.parse(cachedCoins);
        if (coins.expire > Date.now()) {
          // still good -> reuse
          commit("COIN_LIST", {
            data: coins.data,
            expire: new Date().getTime() + getters.coinListInterval
          });
          return;
        }
      }
      // not exists or stale -> fetch new
      let coins = await dispatch("FETCH_COIN_LIST");
      let coinListPayload = {
        name: coinListStoreName,
        data: coins,
        expire: new Date().getTime() + getters.coinListInterval
      };
      dispatch("CACHE", coinListPayload);
      commit("COIN_LIST", coinListPayload);
    },
    // TODO: change to expire instead of age
    CACHE: (s, p) => {
      // console.log("master_rates: cache new rates...");
      localStorage.setItem(
        p.name,
        JSON.stringify({
          expire: p.expire,
          data: p.data
        })
      );
    },
    FETCH_COIN_LIST: async ({ dispatch, getters }) => {
      dispatch("LOG", "Downloading coin list");
      let { data } = await Axios.get(getters.coinListApi);
      return data;
    },
    // TODO: cache this
    GET_PRICE_BY_SYMBOL: async ({ dispatch, getters }, p) => {
      if (!p) return null;
      let coin = getters.coinList.find(
        c => c.symbol.toUpperCase() === p.toUpperCase()
      );
      // console.log(coin);
      // could not get coin info
      if (!coin) {
        dispatch("LOG", `Could not id of symbol: ${p}`);
        return null;
      }
      let { data } = await Axios.get(
        getters.getPriceApi.replace("{ids}", coin.id)
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
    GET_TX: async ({ getters }, p) => {
      if (!p) throw new Error("invalid payload");
      let api = getters.txByAddressApi
        .replace("{address}", getters.walletAddress)
        .replace("{start}", p.min)
        .replace("{end}", p.max)
        .replace("{key}", getters.apiKey);
      let { data } = await Axios.get(api);
      return data;
    },
    FETCH_CONTRACT: async ({ getters }, p) => {
      let { data } = await Axios.get(
        getters.readContractApi.replace("{address}", p)
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
    // ALERT: async (s, p) => {
    //   await Axios.post("/alert", {
    //     symbol: p.symbol,
    //     value: p.value,
    //     hash: p.txHash
    //   });
    // },
    LOAD_CONFIG: ({ commit, dispatch }) => {
      let config = localStorage.getItem(configStoreName);
      if (config) {
        config = JSON.parse(config);
        if (dispatch("UPDATE_CONFIG", config)) {
          commit("IS_CONFIG_VALID", true);
          return true;
        }
        return false;
      }
      return false;
    },
    UPDATE_CONFIG: ({ commit, dispatch }, p) => {
      if (!p) throw new Error("Invalid payload.");
      // check config
      commit("CONFIG", p);
      dispatch("SAVE_CONFIG", p);
      commit("IS_CONFIG_VALID", true);
      return true;
    },
    SAVE_CONFIG: (s, p) => {
      localStorage.setItem(configStoreName, JSON.stringify(p));
    },
    LOAD_DEFAULT_CONFIG: ({ commit }) => {
      commit("DEFAULT_CONFIG");
    },
    LOG: ({ commit }, p) => {
      commit("LAST_LOG", p);
    },
    LOG_ERROR: ({ commit }, p) => {
      commit("LAST_ERROR", p);
    },
    SET_DEBUG: ({ commit }, p) => {
      commit("DEBUG", p);
    }
  }
});
