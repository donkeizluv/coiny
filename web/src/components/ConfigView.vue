<template>
  <v-container>
    <v-layout
      text-xs-center
      wrap>
      <v-flex xs12>
        <v-form>
          <v-text-field
            v-model="newApiKey"
            label="API Key">
          </v-text-field>
          <v-text-field
            v-model="newWalletAddress"
            label="Watched address">
          </v-text-field>
          <v-text-field
            v-model="newMinValue"
            type="number"
            prefix="$"
            label="Min value">
          </v-text-field>
          <v-text-field
            v-model="newTxInterval"
            type="number"
            label="Fetch interval (ms)">
          </v-text-field>
          <v-text-field
            v-model="newRatesInterval"
            type="number"
            label="Refresh rates interval (ms)">
          </v-text-field>
          <!-- <v-divider></v-divider> -->
          <v-text-field
            disabled
            :value="masterPriceApi"
            label="master_rates">
          </v-text-field>
          <v-text-field
            disabled
            :value="blockHeightApi"
            label="block_height">
          </v-text-field>
          <v-text-field
            disabled
            :value="txByAddressApi"
            label="getTx">
          </v-text-field>
          <v-text-field
            disabled
            :value="readContractApi"
            label="getContract">
          </v-text-field>
          <v-btn @click="applyConfig" :disabled="!isConfigValid" color="success">
            Apply
          </v-btn>
          <v-btn @click="loadValues" color="info">
            Reload
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
      "ratesInterval",
      "minValue",
      "walletAddress",
      "maxBlockHeight",
      "masterRates",
      "masterPriceApi",
      "blockHeightApi",
      "txByAddressApi",
      "readContractApi",
      "ratesInterval"
    ]),
    isConfigValid(){
      if(!this.newApiKey) return false;
      if(this.newTxInterval) {
        // too small
        if(this.newTxInterval < 999) return false;
      } else {
        return false;
      }
      if(this.newRatesInterval) {
        if(this.newRatesInterval < 2222) return false;
      } else {
        return false;
      }
      if(this.newMinValue) {
        if(this.newMinValue < 0) return false;
      }else {
        return false;
      }
      if(!this.newWalletAddress) return false;
      return true;
    }
  },
  methods: {
    ...mapActions([
      "UPDATE_CONFIG"
    ]),
    loadValues() {
      this.newApiKey = this.apiKey;
      this.newTxInterval = this.txInterval;
      this.newMinValue = this.minValue;
      this.newWalletAddress = this.walletAddress;
      this.newRatesInterval = this.ratesInterval;
      this.changed = false;
    },
    applyConfig() {
      let p = {
        apiKey: this.newApiKey,
        txInterval: this.newTxInterval,
        minValue: this.newMinValue,
        walletAddress: this.newWalletAddress,
        ratesInterval: this.newRatesInterval
      };
      this.UPDATE_CONFIG(p);
      this.loadValues();
    }
  },
  data() {
    return {
      newApiKey: "",
      newTxInterval: 0,
      newMinValue: 0,
      newWalletAddress: "",
      newRatesInterval: 0
    };
  }
};
</script>

<style>
</style>
