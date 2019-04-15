<template>
  <v-container>
    <v-layout row wrap>
      <v-checkbox
        d-inline-block
        small
        label="Pause"
        v-model="isPaused"
      ></v-checkbox>
      <v-checkbox
        d-inline-block
        small
        label="IN only"
        v-model="inOnly"
      ></v-checkbox>
      <v-checkbox
        d-inline-block
        small
        label="+ Only"
        v-model="plusDifOnly"
      ></v-checkbox>
      <v-checkbox
        d-inline-block
        small
        label="Show console"
        v-model="showConsole"
      ></v-checkbox>
      <v-flex xs12>
        <v-data-table
          :headers="headers"
          :items="displayItems"
          :pagination.sync="pagination"
          class="elevation-1"
        >
          <template slot="headers" slot-scope="props">
            <tr>
              <th
                v-for="header in props.headers"
                :key="header.text"
                :class="[
                  'column sortable',
                  pagination.descending ? 'desc' : 'asc',
                  header.value === pagination.sortBy ? 'active' : ''
                ]"
                @click="changeSort(header.value)"
              >
                <template v-if="header.value === 'symbol'">
                  <v-progress-circular
                    indeterminate
                    size="24"
                    v-if="isLoading"
                    color="green"
                  ></v-progress-circular>
                  <v-progress-circular
                    v-else
                    size="24"
                    value="100"
                    color="#686868"
                  ></v-progress-circular>
                </template>
                <v-icon small>mdi-arrow-up</v-icon>
                {{ header.text }}
              </th>
            </tr>
          </template>
          <template slot="items" slot-scope="props">
            <tr :key="props.index">
              <td
                :class="[
                  props.item.dif > 0 ? 'match1' : 'match0',
                  'text-xs-center'
                ]"
              >
                {{ props.item.symbol }}
              </td>
              <td
                :class="[
                  props.item.dif > 0 ? 'match1' : 'match0',
                  'text-xs-center'
                ]"
              >
                {{ props.item.amount }}
              </td>
              <td
                :class="[
                  props.item.dif > 0 ? 'match1' : 'match0',
                  'text-xs-center'
                ]"
              >
                {{ props.item.value ? "$" + props.item.value : "?" }}
              </td>
              <td
                :class="[
                  props.item.dif > 0 ? 'match1' : 'match0',
                  'text-xs-center'
                ]"
              >
                {{ props.item.dif }}
              </td>
              <td
                :class="[
                  props.item.dif > 0 ? 'match1' : 'match0',
                  'text-xs-center'
                ]"
              >
                <a @click="openTx(props.item.txHash)"
                  >{{ props.item.txHash.substring(0, 13) }}...</a
                >
              </td>

              <td v-if="props.item.direction === 'IN'" class="text-xs-center">
                <v-chip small color="green" text-color="white">IN</v-chip>
              </td>
              <td v-else class="text-xs-center">
                <v-chip small color="red" text-color="white">OUT</v-chip>
              </td>

              <td
                :class="[
                  props.item.dif > 0 ? 'match1' : 'match0',
                  'text-xs-center'
                ]"
              >
                {{ props.item.timeStamp }}
              </td>
              <td
                :class="[
                  props.item.dif > 0 ? 'match1' : 'match0',
                  'text-xs-center'
                ]"
              >
                {{ props.item.elapsedMinute }}m ago
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-flex>
      <v-flex xs12>
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
          :value="consoleContent"
        ></v-textarea>
      </v-flex>
      <v-flex text-xs-right xs12>
        <v-btn
          color="secondary"
          v-show="showConsole"
          @click="consoleContent = ''"
          >Clear</v-btn
        >
        <v-btn v-show="isDebug" flat small @click="addFakeTx"
          >Add fake tx</v-btn
        >
        <!-- debug control -->
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import Ticker from "./logic/txTicker";

export default {
  mounted() {
    // make sure only one loop is created
    // looks like HMR is causing multiple call on this
    this.start();
  },
  beforeDestroy() {
    Ticker.stop();
  },
  computed: {
    ...mapGetters([
      "txInterval",
      "minValue",
      "isConfigValid",
      "walletAddress",
      "maxBlockHeight",
      // "running",
      "loading",
      "lastLog",
      "openTxUrl",
      "isDebug"
    ]),
    isLoading() {
      // app loading
      if (this.loading) return true;
      //view loading
      return this.localLoading;
    },
    displayItems() {
      let items = this.items
        .map(i => i)
        .filter(i => (this.inOnly ? i.direction === "IN" : true));
      items.forEach(i => {
        i.dif = (i.value - this.minValue).toFixed(3);
        i.elapsedMinute = this.elapsedMinute(i.tick);
      });
      items = items.filter(i => (this.plusDifOnly ? i.dif > 0 : true));
      return items;
    }
  },
  watch: {
    lastLog(log) {
      this.log(log);
    },
    isPaused(value) {
      if (value) this.log("Pause...");
      else this.log("Resume...");
    }
  },
  data() {
    return {
      localLoading: false,
      isRunning: false,
      isPaused: false,
      consoleContent: "",
      inOnly: false,
      showConsole: true,
      plusDifOnly: false,
      headers: [
        { text: "Symbol", value: "symbol" },
        { text: "Amount", value: "amount" },
        { text: "$", value: "value" },
        { text: "Dif.", value: "dif" },
        { text: "Tx.", value: "txHash", sortable: false },
        { text: "Direction", value: "direction" },
        { text: "Time", value: "timeStamp" },
        { text: "Elapsed", value: "elapsedMinute" }
      ],
      pagination: {
        sortBy: "elapsedMinute",
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
      "REFRESH_COIN_LIST",
      "REFRESH_MAX_BLOCK_HEIGHT",
      "GET_TX",
      "GET_CONTRACT",
      "GET_PRICE_BY_SYMBOL"
      // "RUNNING"
      // "ALERT"
    ]),
    convertToItems(raw) {
      return raw.map(t => {
        let item = {
          symbol: t.tokenSymbol,
          amount: t.tokenDecimal
            ? (t.value / Math.pow(10, t.tokenDecimal)).toFixed(3)
            : "N/A",
          price: t.price,
          value: 0,
          dif: 0,
          txHash: t.hash,
          tick: t.timeStamp,
          timeStamp: this.timeStampToDateString(t.timeStamp),
          elapsedMinute: 0,
          direction: this.walletAddress === t.to ? "IN" : "OUT"
        };
        // calculate value if possible
        if (item.amount !== 0 && item.price !== 0) {
          item.value = (item.amount * item.price).toFixed(3);
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
      if (this.isRunning) return;
      this.isRunning = true;
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
      window.open(this.openTxUrl.replace("{hash}", hash));
    },
    // onPauseClick() {
    //   if (this.isPaused) {
    //     this.log("Resume...");
    //     return;
    //   }
    //   this.log("Pause...");
    // },
    txLink(hash) {
      return this.openTxUrl.replace("{hash}", hash);
    },
    timeStampToDateString(timeStamp) {
      return new Date(timeStamp * 1000).toLocaleString();
    },
    changeSort(column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending;
      } else {
        this.pagination.sortBy = column;
        this.pagination.descending = false;
      }
    },
    elapsedMinute(timeStamp) {
      let diff = Math.abs(Date.now() - timeStamp * 1000);
      return Math.floor(diff / 60000);
    },
    addFakeTx() {
      this.items.push({
        symbol: "BKX",
        amount: "50.178",
        price: 0.02511477,
        value: "1.260",
        dif: "-4998.740",
        txHash:
          "0x18700c4775ef54e2bf6e9b48e519e6b0c4244b85299ec27403acdee3558ced1c",
        tick: "1555263478",
        timeStamp: "4/15/2019, 12:37:58 AM",
        elapsedMinute: 2,
        direction: "IN"
      });
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
.match0 {
  color: gray;
}
.padding1 {
  padding-top: 25px;
}
.console-color textarea {
  color: gray !important;
}
</style>
