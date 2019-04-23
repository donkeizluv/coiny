<template>
  <v-container>
    <v-layout text-xs-center wrap>
      <v-flex xs12>
        <v-subheader>General settings</v-subheader>
        <v-form>
          <v-container>
            <v-layout wrap>
              <v-flex xs12>
                <v-checkbox
                  v-model="debugMode"
                  d-inline-block
                  small
                  label="Debug mode"
                ></v-checkbox>
              </v-flex>
            </v-layout>
          </v-container>
        </v-form>
      </v-flex>
      <v-flex xs12>
        <v-subheader>Alert settings</v-subheader>
        <v-form>
          <v-container>
            <v-layout wrap>
              <v-flex xs12>
                <v-text-field label="sameple..."></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-text-field label="sameple..."></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-btn
                  small
                  :disabled="!isConfigValid"
                  color="success"
                  @click="applyConfig"
                  >Apply</v-btn
                >
                <v-btn small color="info" @click="loadValues">Reload</v-btn>
                <v-btn small color="warning" @click="loadDefault"
                  >Default</v-btn
                >
              </v-flex>
            </v-layout>
          </v-container>
        </v-form>
      </v-flex>
      <v-flex xs12>
        <v-subheader>Tx Watcher settings</v-subheader>
        <v-form>
          <v-container>
            <v-layout wrap>
              <v-flex xs6>
                <v-text-field
                  v-model="newApiKey"
                  label="API Key"
                ></v-text-field>
              </v-flex>
              <v-flex xs6>
                <v-text-field
                  v-model="newWalletAddress"
                  label="Watched address"
                ></v-text-field>
              </v-flex>
              <v-flex xs4>
                <v-text-field
                  v-model="newMinValue"
                  type="number"
                  prefix="$"
                  label="Min value"
                ></v-text-field>
              </v-flex>
              <v-flex xs4>
                <v-text-field
                  v-model="newTxInterval"
                  type="number"
                  label="Fetch interval (ms)"
                ></v-text-field>
              </v-flex>
              <v-flex xs4>
                <v-text-field
                  v-model="newCoinListInterval"
                  type="number"
                  label="Refresh coin list interval (ms)"
                ></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-text-field
                  disabled
                  :value="coinListApi"
                  label="coin_list"
                ></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-text-field
                  disabled
                  :value="blockHeightApi"
                  label="block_height"
                ></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-text-field
                  disabled
                  :value="txByAddressApi"
                  label="getTx"
                ></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-text-field
                  disabled
                  :value="readContractApi"
                  label="getContract"
                ></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-text-field
                  disabled
                  :value="openTxUrl"
                  label="openTxUrl"
                ></v-text-field>
              </v-flex>
              <v-flex xs12>
                <v-btn
                  small
                  :disabled="!isConfigValid"
                  color="success"
                  @click="applyConfig"
                  >Apply</v-btn
                >
                <v-btn small color="info" @click="loadValues">Reload</v-btn>
                <v-btn small color="warning" @click="loadDefault"
                  >Default</v-btn
                >
              </v-flex>
            </v-layout>
          </v-container>
        </v-form>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  data() {
    return {
      debugMode: false,
      newApiKey: "",
      newTxInterval: 0,
      newMinValue: 0,
      newWalletAddress: "",
      newCoinListInterval: 0
    };
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
      "openTxUrl",
      "isDebug"
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
  watch: {
    debugMode(value) {
      this.SET_DEBUG(value);
    }
  },
  mounted() {
    this.loadValues();
    this.init = true;
    this.debugMode = this.isDebug;
  },
  methods: {
    ...mapActions(["UPDATE_CONFIG", "LOAD_DEFAULT_CONFIG", "SET_DEBUG"]),
    loadValues() {
      this.newApiKey = this.apiKey;
      this.newTxInterval = this.txInterval;
      this.newMinValue = this.minValue;
      this.newWalletAddress = this.walletAddress;
      this.newCoinListInterval = this.coinListInterval;
      this.changed = false;
    },
    async applyConfig() {
      let p = {
        apiKey: this.newApiKey,
        txInterval: this.newTxInterval,
        minValue: this.newMinValue,
        walletAddress: this.newWalletAddress,
        coinListInterval: this.newCoinListInterval
      };
      await this.UPDATE_CONFIG(p);
      this.loadValues();
    },
    loadDefault() {
      this.LOAD_DEFAULT_CONFIG();
      this.loadValues();
    }
  }
};
</script>

<style></style>
