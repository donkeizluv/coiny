<template>
  <v-container>
    <v-layout text-xs-center wrap>
      <v-flex xs12>
        <v-form>
          <v-text-field v-model="newApiKey" label="API Key"> </v-text-field>
          <v-text-field v-model="newWalletAddress" label="Watched address">
          </v-text-field>
          <v-text-field
            v-model="newMinValue"
            type="number"
            prefix="$"
            label="Min value"
          >
          </v-text-field>
          <v-text-field
            v-model="newTxInterval"
            type="number"
            label="Fetch interval (ms)"
          >
          </v-text-field>
          <v-text-field
            v-model="newCoinListInterval"
            type="number"
            label="Refresh coin list interval (ms)"
          >
          </v-text-field>
          <!-- <v-divider></v-divider> -->
          <v-text-field disabled :value="coinListApi" label="coin_list">
          </v-text-field>
          <v-text-field disabled :value="blockHeightApi" label="block_height">
          </v-text-field>
          <v-text-field disabled :value="txByAddressApi" label="getTx">
          </v-text-field>
          <v-text-field disabled :value="readContractApi" label="getContract">
          </v-text-field>
          <v-text-field disabled :value="openTxUrl" label="openTxUrl">
          </v-text-field>
          <v-btn
            @click="applyConfig"
            :disabled="!isConfigValid"
            color="success"
          >
            Apply
          </v-btn>
          <v-btn @click="loadValues" color="info">
            Reload
          </v-btn>
          <v-btn @click="loadDefault" color="warning">
            Default
          </v-btn>
        </v-form>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  mounted() {
    this.loadValues();
    this.init = true;
  },
  computed: {
    ...mapGetters([
      "apiKey",
      "txInterval",
      "coinListInterval",
      "minValue",
      "walletAddress",
      "maxBlockHeight",
      "coinListApi",
      "blockHeightApi",
      "txByAddressApi",
      "readContractApi",
      "openTxUrl"
    ]),
    isConfigValid() {
      if (!this.newApiKey) return false;
      if (this.newTxInterval) {
        // too small
        if (this.newTxInterval < 999) return false;
      } else {
        return false;
      }
      if (this.newCoinListInterval) {
        if (this.newCoinListInterval < 120000) return false;
      } else {
        return false;
      }
      if (this.newMinValue) {
        if (this.newMinValue < 0) return false;
      } else {
        return false;
      }
      if (!this.newWalletAddress) return false;
      return true;
    }
  },
  methods: {
    ...mapActions(["UPDATE_CONFIG", "LOAD_DEFAULT_CONFIG"]),
    loadValues() {
      this.newApiKey = this.apiKey;
      this.newTxInterval = this.txInterval;
      this.newMinValue = this.minValue;
      this.newWalletAddress = this.walletAddress;
      this.newCoinListInterval = this.coinListInterval;
      this.changed = false;
    },
    applyConfig() {
      let p = {
        apiKey: this.newApiKey,
        txInterval: this.newTxInterval,
        minValue: this.newMinValue,
        walletAddress: this.newWalletAddress,
        coinListInterval: this.newCoinListInterval
      };
      this.UPDATE_CONFIG(p);
      this.loadValues();
    },
    loadDefault() {
      this.LOAD_DEFAULT_CONFIG();
      this.loadValues();
    }
  },
  data() {
    return {
      newApiKey: "",
      newTxInterval: 0,
      newMinValue: 0,
      newWalletAddress: "",
      newCoinListInterval: 0
    };
  }
};
</script>

<style></style>
