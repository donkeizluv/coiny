<template>
  <v-container>
    <v-layout wrap>
      <v-flex xs12>
        <v-form>
          <v-container>
            <v-layout wrap>
              <v-flex xs4>
                <v-autocomplete
                  v-model="selectedSymbol"
                  :items="bSymbols"
                  dense
                  auto-select-first
                  clearable
                  no-data-text="no match"
                  label="B Symbols"
                  item-text="name"
                  item-value="value"
                  @keyup.enter="onAddClick"
                ></v-autocomplete>
              </v-flex>
              <v-flex xs3>
                <v-text-field
                  v-model="alarmValue"
                  type="number"
                  label="Alarm value"
                  @keyup.enter="onAddClick"
                ></v-text-field>
              </v-flex>
              <v-flex xs1>
                <v-radio-group v-model="upDownRd" class="ma-0" column>
                  <v-radio
                    color="green"
                    selected
                    label="Up"
                    value="up"
                  ></v-radio>
                  <v-radio color="red" label="Down" value="down"></v-radio>
                </v-radio-group>
              </v-flex>
              <v-flex xs2>
                <v-btn
                  :disabled="!canAdd"
                  color="success"
                  class="mt-3"
                  @click="onAddClick"
                  >Add</v-btn
                >
              </v-flex>
            </v-layout>
          </v-container>
        </v-form>
      </v-flex>
      <v-flex xs12>
        <v-flex xs12>
          <v-data-table
            :headers="table.headers"
            :items="symbols"
            :pagination.sync="table.pagination"
            class="elevation-1"
          >
            <template slot="headers" slot-scope="props">
              <tr>
                <th
                  v-for="header in props.headers"
                  :key="header.text"
                  :class="[
                    'column sortable',
                    table.pagination.descending ? 'desc' : 'asc',
                    header.value === table.pagination.sortBy ? 'active' : ''
                  ]"
                  @click="changeSort(header.value)"
                >
                  <v-icon v-show="header.sortable" small>mdi-arrow-up</v-icon>
                  {{ header.text }}
                </th>
              </tr>
            </template>
            <template slot="items" slot-scope="props">
              <tr :key="props.index">
                <td class="text-xs-center">{{ props.item.symbol }}</td>
                <td class="text-xs-center">
                  <v-icon
                    v-if="props.item.trend === 1"
                    class="small-icon"
                    color="green"
                  >
                    mdi-arrow-up-bold
                  </v-icon>
                  <v-icon
                    v-if="props.item.trend === -1"
                    class="small-icon"
                    color="red"
                  >
                    mdi-arrow-down-bold
                  </v-icon>
                  {{ props.item.price }}
                </td>
                <td class="text-xs-center">{{ props.item.alarm }}</td>
                <td class="text-xs-center">
                  <v-chip
                    v-if="props.item.up"
                    small
                    label
                    outline
                    color="green"
                    text-color="white"
                  >
                    UP
                  </v-chip>
                  <v-chip
                    v-else
                    small
                    label
                    outline
                    color="red"
                    text-color="white"
                  >
                    DOWN
                  </v-chip>
                </td>
                <td class="text-xs-center">
                  {{ props.item.difPercentage | percentage }}
                </td>
                <td class="text-xs-center">
                  {{ props.item.set ? "Yes" : "No" }}
                </td>
                <td class="text-xs-center">
                  <!-- <v-btn small icon color="green darken-1" @click="onEditSymbolClick(props.item)">
                    <v-icon class="small-icon">mdi-pencil</v-icon>
                  </v-btn> -->
                  <v-btn
                    small
                    flat
                    icon
                    color="orange"
                    :disabled="!props.item.set"
                    @click="onSetSymbolClick(props.item)"
                  >
                    <v-icon>mdi-alarm-plus</v-icon>
                  </v-btn>
                  <v-btn
                    small
                    flat
                    icon
                    color="pink lighten-2"
                    @click="onRemoveSymbolClick(props.item)"
                  >
                    <v-icon>mdi-close</v-icon>
                  </v-btn>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-flex>
      </v-flex>
      <!-- <v-flex xs12></v-flex> -->
    </v-layout>
  </v-container>
</template>
<script>
import { mapActions, mapGetters } from "vuex";
import Ticker from "./logic/alarmTicker";

export default {
  filters: {
    percentage: function(value) {
      if (!value) return "-";
      if (Math.abs(value) > 9999) return ">9999%";
      if (Math.abs(value) < 0.0001) return "<0.0001%";
      return `${value}%`;
    }
  },
  data() {
    return {
      isConfigValid: true,
      isPause: false,
      isLoading: false,
      isRunning: false,
      isActivated: false,
      alarmValue: 0,
      selectedSymbol: null,
      upDownRd: "up",
      symbols: [],
      rates: [],
      // trends: [],
      table: {
        headers: [
          { text: "Symbol", value: "symbol", sortable: true },
          { text: "Price", value: "price", sortable: true },
          { text: "Alarm", value: "alarm", sortable: true },
          { text: "Type", sortable: true },
          { text: "Dif.", value: "dif", sortable: true },
          { text: "Set", value: "set", sortable: true },
          { text: "Action", sortable: false }
        ],
        pagination: {
          sortBy: "symbol",
          descending: true
        }
      }
    };
  },
  computed: {
    ...mapGetters("alarm", ["exchangeInfo", "intervals"]),

    bSymbols() {
      return this.exchangeInfo.bSymbols.map(i => {
        let rate = this.getRate(i.symbol);
        return {
          value: i.symbol,
          name: `${i.baseAsset}${i.quoteAsset}  ${rate ? `(${rate})` : ""}`
        };
      });
    },
    canAdd() {
      return (
        this.rates.length > 0 && !isNaN(this.alarmValue) && this.alarmValue > 0
      );
    },
    isUpRd() {
      return this.upDownRd === "up";
    },
    tickRate() {
      return this.intervals.price.rate;
    }
  },
  async mounted() {
    await this.reloadFromStore();
    this.start();
  },
  beforeDestroy() {
    Ticker.stop();
  },
  activated() {
    this.isActivated = true;
    this.isPaused = false;
  },
  deactivated() {
    this.isActivated = false;
    // dont run in background if everything is set
    if (this.symbols.every(s => s.set)) this.isPaused = true;
  },
  methods: {
    ...mapActions("alarm", [
      "REFRESH_EXCHANGE_INFO",
      "GET_RATE",
      "ALARM",
      "PERSIST_SYMBOLS",
      "GET_STORE_SYMBOLS"
    ]),
    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.log("Starting...");
      Ticker.start(this);
      this.log("Started sucessfully");
    },
    // onEditSymbolClick(item) {
    //   return;
    // },
    onSetSymbolClick(item) {
      item.set = false;
    },
    async onRemoveSymbolClick(item) {
      this.symbols.splice(this.symbols.indexOf(item), 1);
      await this.persist();
    },
    async onAddClick() {
      if (!this.canAdd) return;
      // if new symbol matched current symbol, update it instead
      let sym = this.symbols.find(
        s => s.symbol === this.selectedSymbol && s.up === this.isUpRd
      );
      let symIndex = this.symbols.indexOf(sym || {});
      // exists, update it
      if (symIndex !== -1) {
        sym.alarm = this.alarmValue;
        sym.up = this.isUpRd;
        sym.set = false;
        sym.dif = 0;
        sym.difPercentage = 0;
        this.symbols[symIndex] = sym;
        await this.persist();
        this.$emit("success", `Updated ${this.selectedSymbol}`);
        return;
      }
      // create new symbol
      this.symbols.push(
        this.createSymbol(this.selectedSymbol, this.alarmValue, this.isUpRd)
      );
      await this.persist();
      this.$emit("success", `Added ${this.selectedSymbol}`);
    },
    async persist() {
      await this.PERSIST_SYMBOLS(this.symbols);
    },
    async reloadFromStore() {
      let symbols = await this.GET_STORE_SYMBOLS();
      if (!symbols || symbols.length < 1) return;
      // clear all dif and price
      for (let index = 0; index < symbols.length; index++) {
        const element = symbols[index];
        element.dif = 0;
        element.difPercentage = 0;
        element.price = 0;
      }
      this.symbols = symbols;
    },
    createSymbol(symbol, alarmValue, up) {
      let rate = this.getRate(this.selectedSymbol);
      let sym = {
        symbol: symbol,
        price: rate,
        alarm: Number(alarmValue),
        dif: 0,
        difPercentage: 0,
        set: false,
        up: up,
        trend: 0
      };
      sym.dif = (sym.alarm / rate) * 100 - 100;
      sym.difPercentage = new Number(sym.dif).toPrecision(4);
      return sym;
    },
    changeSort(column) {
      if (this.table.pagination.sortBy === column) {
        this.table.pagination.descending = !this.table.pagination.descending;
      } else {
        this.table.pagination.sortBy = column;
        this.table.pagination.descending = false;
      }
    },
    toPercentage(value) {
      return Math.round(value * 100);
    },
    getRate(sym) {
      return Number(
        (this.rates.find(r => r.symbol === sym) || { price: 0 }).price
      );
    },
    async soundAlarm(sym) {
      if (sym.set) return;
      if (
        (sym.up && sym.price >= sym.alarm) ||
        (!sym.up && sym.price <= sym.alarm)
      ) {
        this.ALARM({
          symbol: sym.symbol,
          price: sym.price,
          up: sym.up,
          at: new Date().toLocaleTimeString()
        });
        sym.set = true;
        await this.persist();
        this.$emit("notify", {
          title: "Coiny",
          message: `${sym.symbol}: ${sym.up ? "UP" : "DOWN"} to ${sym.price}`
        });
      }
    },
    log(m) {
      return m;
    }
  }
};
</script>
<style scoped>
.small-icon {
  font-size: 1.2em;
}
</style>
