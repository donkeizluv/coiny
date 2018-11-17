<template>
  <v-container>
    <v-layout
      text-xs-center
      wrap>
      <v-checkbox
        d-inline-block
        small
        label="Pause"
        @click="pauseClicked"
        v-model="isPaused">
      </v-checkbox>
      <v-checkbox
        d-inline-block
        small
        label="IN only"
        v-model="inOnly">
      </v-checkbox>
      <v-checkbox
        d-inline-block
        small
        label="+ Only"
        v-model="plusDifOnly">
      </v-checkbox>
      <v-checkbox
        d-inline-block
        small
        label="Show console"
        v-model="showConsole">
      </v-checkbox>
      <v-flex xs12>
        <v-data-table
          :headers="headers"
          :items="getItems"
          :pagination.sync="pagination"
          class="elevation-1">
          <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
          <template slot="items" slot-scope="props">
            <tr :class="[props.item.dif > 0 ? 'matchRow' : '']" :key="props.index">
              <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">{{ props.item.symbol }}</td>
              <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">{{ props.item.amount }}</td>
              <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">{{ props.item.value ? "$" + props.item.value : "?" }}</td>
              <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">{{ props.item.dif }}</td>
              <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">
                <a @click="openTx(props.item.txHash)">{{props.item.txHash.substring(0,13)}}...</a>
              </td>

              <td v-if="props.item.direction === 'IN'" class="text-xs-left">
                <v-chip small color="green" text-color="white">IN</v-chip>
              </td>
              <td v-else class="text-xs-left">
                <v-chip small color="red" text-color="white">OUT</v-chip>
              </td>

              <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">{{ props.item.timeStamp }}</td>
            </tr>
          </template>
          <template slot="pageText" slot-scope="props">
            <v-progress-circular
              indeterminate
              size=26
              v-if="isLoading"
              color="green">
            </v-progress-circular>
            <v-progress-circular
              v-else
              size=26
              value=100
              color="#686868">
            </v-progress-circular>
            &nbsp;
            Total: {{ props.itemsLength }}
          </template>
        </v-data-table>
      </v-flex>
      <v-flex align-content-end xs12>
        <v-textarea
          v-show="showConsole"
          label="Console"
          no-resize
          readonly
          class="padding1"
          outline
          background-color="green"
          height="400px"
          color="gray"
          :value="consoleContent">
        </v-textarea>
        <v-btn v-show="showConsole" color="secondary" @click="consoleContent = ''">Clear</v-btn>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import Ticker from "./txTicker";

export default {
  mounted() {
    // make sure only one loop is created
    // looks like HMR is causing multiple call on this
    this.start();
  },
  beforeDestroy() {
    this.stopTicker = true;
  },
  computed: {
    ...mapGetters([
      "txInterval",
      "ratesInterval",
      "minValue",
      "ready",
      "walletAddress",
      "maxBlockHeight",
      "masterRates",
      "running",
      "loading",
      "lastLog"
    ]),
    isLoading() {
      // app loading
      if(this.loading) return true;
      //view loading
      return this.localLoading;
    },
    getItems() {
      const vm = this;
      let items = vm.items
        .map(i => i)
        .filter(i => (vm.inOnly ? i.direction === "IN" : true));
      items.forEach(i => {
        i.dif = (i.value - vm.minValue).toFixed(3);
      });
      items = items.filter(i => (vm.plusDifOnly ? i.dif > 0 : true));
      return items;
    }
  },
  watch: {
    lastLog(log) {
      this.log(log);
    }
  },
  data() {
    return {
      localLoading: false,
      isPaused: false,
      consoleContent: "",
      stopTicker: false,
      inOnly: false,
      showConsole: true,
      plusDifOnly: false,
      headers: [
        { text: "Symbol", value: "symbol" },
        { text: "Amount", value: "amount" },
        { text: "$", value: "value" },
        { text: "Dif", value: "dif" },
        { text: "Tx", value: "txHash", sortable: false },
        { text: "Direction", value: "direction" },
        { text: "Time", value: "timeStamp" }
      ],
      pagination: {
        sortBy: "timeStamp",
        descending: true
      },
      items: [],
      // ticker setting
      lastHeight: 0,
      rescan: 6, //each number of blocks to do re-scan
      lastRescan: 0
    };
  },
  methods: {
    ...mapActions([
      "REFRESH_MASTER_RATES",
      "REFRESH_MAX_BLOCK_HEIGHT",
      "GET_TX",
      "GET_CONTRACT",
      "RUNNING",
      "ALERT"
    ]),
    convertToItems(raw) {
      return raw.map(t => {
        let item = {
          symbol: t.tokenSymbol,
          amount: t.tokenDecimal
            ? (t.value / Math.pow(10, t.tokenDecimal)).toFixed(3)
            : "N/A",
          value: 0,
          dif: 0,
          txHash: t.hash,
          timeStamp: this.timeStampToDateString(t.timeStamp),
          direction: this.walletAddress === t.to ? "IN" : "OUT"
        };
        if (!isNaN(item.amount)) {
          // calculate value of this tx
          let marketInfo = this.masterRates.find(
            mr => mr.symbol.toUpperCase() === item.symbol.toUpperCase()
          );
          if (!marketInfo) {
            this.log(`ERROR: can not get market info of ${item.symbol}`);
            return item;
          }
          item.value = (item.amount * marketInfo.current_price).toFixed(3);
        }
        return item;
      });
    },
    calculateRange(min, max) {
      // use last reScan if min is more than reScan threshold
      let lastRescan = this.lastRescan;
      if (min - lastRescan >= this.rescan) {
        this.log(`Re-scan from ${lastRescan} to ${max}`);
        // update lastRescan
        this.lastRescan = min;
        return { min: lastRescan, max };
      }
      // normal case
      // if min === 0 OR min === max then use max as min
      // otherwise use min
      return {
        min: min === 0 || min === max ? max : min,
        max: max
      };
    },
    start() {
      if (this.running) return;
      this.RUNNING(true);
      this.log("Starting...");
      Ticker.start(this);
      this.log("Started sucessfully");
    },
    log(message) {
      if (!this.showConsole) return;
      let now = new Date(Date.now());
      this.consoleContent += `${now.toLocaleTimeString()} - ${message}\n`;
    },
    openTx(hash) {
      window.open("https://etherscan.io/tx/{hash}".replace("{hash}", hash));
    },
    pauseClicked() {
      if (this.isPaused) {
        this.log("Pause...");
        return;
      }
      this.log("Resume...");
    },
    txLink(hash) {
      return "https://etherscan.io/tx/{hash}".replace("{hash}", hash);
    },
    timeStampToDateString(timeStamp) {
      return new Date(timeStamp * 1000).toLocaleString();
    }
  }
};
</script>

<style scoped>
.textStart {
  text-align: start;
}
.match1 {
  color: greenyellow;
}
.match2 {
  color: green;
}
.match3 {
  color: darkolivegreen;
}
.padding1 {
  padding-top: 25px;
}
.console-color textarea {
  color: gray !important;
}
</style>
