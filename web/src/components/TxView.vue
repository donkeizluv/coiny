<template>
  <v-container>
    <v-layout
      text-xs-center
      wrap>
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
          :loading="loading"
          class="elevation-1">
          <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
          <template slot="items" slot-scope="props">
            <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">{{ props.item.symbol }}</td>
            <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">{{ props.item.amount }}</td>
            <td :class="[props.item.dif > 0 ? 'match1' : '', 'text-xs-left']">${{ props.item.value }}</td>
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
          </template>
          <!-- <template slot="footer">
            <td class="textEnd" colspan="100%">
             
            </td>
          </template> -->
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
          :value="consoleContent">
        </v-textarea>
        <v-btn v-show="showConsole" color="secondary" @click="consoleContent = ''">Clear</v-btn>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  mounted() {
    // make sure only one loop is created
    // looks like HMR is causing multiple call on this
    this.start();
  },
  beforeDestroy(){
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
      "loading"
    ]),
    getItems() {
      const vm = this;
      let items = vm.items
        .map(i => i)
        .filter(i => vm.inOnly ? i.direction === "IN" : true);
      items.forEach(i => {
        i.dif = (i.value - vm.minValue).toFixed(3);
      })
      items = items.filter(i => vm.plusDifOnly ? i.dif > 0 : true);
      return items;
    }
  },
  data() {
    return {
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
        sortBy: 'timeStamp',
        descending: true
      },
      items: [
        // {
        //   symbol: "T",
        //   amount: 444,
        //   value: 3,
        //   dif: 0,
        //   txHash: "0x000",
        //   timeStamp: 1234567,
        //   direction: "IN",
        // },
        // {
        //   symbol: "F",
        //   amount: 444,
        //   value: 444,
        //   dif: 0,
        //   txHash: "0x000",
        //   timeStamp: 1234567,
        //   direction: "OUT",
        // }
      ]
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
          amount: t.tokenDecimal ? (t.value / Math.pow(10, t.tokenDecimal)).toFixed(3) : "N/A",
          value: 0,
          dif: 0,
          txHash: t.hash,
          timeStamp: this.timeStampToDateString(t.timeStamp),
          direction: this.walletAddress === t.to ? "IN" : "OUT" 
        };
        if(!isNaN(item.amount)){
          // calculate value of this tx
          let marketInfo = this.masterRates
            .find(mr => mr.symbol.toUpperCase() === item.symbol.toUpperCase());
          if(!marketInfo){
            this.log(`ERROR: can not get market info of ${item.symbol}`);
            return item;
          }
          item.value = (item.amount * marketInfo.current_price).toFixed(3);
        }
        return item;
      });
    },
    getTxRange(min, max) {
      // if min === 0 OR min === max then use max as min
      // otherwise use min + 1
      return {
        min: min === 0 || min === max ? max : min + 1,
        max: max
      };
    },
    start() {
      const vm = this;
      if (vm.running) return;
      vm.RUNNING(true);
      this.log("Starting...");

      let lastHeight = 0;
      const fetchTx = d => {
        setTimeout(async () => {
          if(vm.stopTicker) {
            this.log("Stopping...");
            // kill this loop
            vm.stopTicker = false;
            vm.RUNNING(false);
            return;
          }
          if (vm.ready) {
            this.log("Start polling");
            await vm.REFRESH_MASTER_RATES();
            let heightChanged = await vm.REFRESH_MAX_BLOCK_HEIGHT();
            // only fetch tx if height changed
            if (heightChanged) {
              let { result } = await vm.GET_TX(
                vm.getTxRange(lastHeight, vm.maxBlockHeight)
              );
              // save check point
              lastHeight = vm.maxBlockHeight;
              this.log(`Tx count: ${result.length}`);
              // fill missing contract data
              // forEach dont do well with async
              // for-in, for-of cant update the item
              for (let index = 0; index < result.length; index++) {
                const t = result[index];
                if(t.tokenDecimal)
                  continue;
                let contract = await vm.GET_CONTRACT(t.contractAddress);
                if(!contract && !contract.error){
                  // TODO: notify
                  vm.log(`ERROR: can not get contract info of ${t.contractAddress}`);
                  continue;
                }
                t.tokenDecimal = contract.decimal;
                t.tokenSymbol = contract.symbol;
                
              }
              let items = vm.convertToItems(result);
              // notify
              items.forEach(i => {
                if(i.value > this.minValue)
                  this.ALERT(i);
              });
              vm.items.push(...items);
            }
            this.log("No new blocks");
          }
          // this.log("Back to sleep");
          fetchTx(vm.txInterval);
        }, d);
      };
      fetchTx(0);
      this.log("Started sucessfully");
    },
    log(message) {
      let now = new Date(Date.now());
      this.consoleContent += `${now.toLocaleTimeString()} - ${message}\n`;
    },
    openTx(hash) {
      window.open("https://etherscan.io/tx/{hash}".replace("{hash}", hash));
    },
    txLink(hash) {
      return "https://etherscan.io/tx/{hash}".replace("{hash}", hash);
    },
    timeStampToDateString(timeStamp) {
      return new Date(timeStamp * 1000).toLocaleString();
    },
    // notifyMe(tx) {
    //   // doest work really well
    //   // chrome does not accept http to send push...
    //   const vm = this;
    //   if (!("Notification" in window)) {
    //     this.$emit("error", "This browser does not support desktop notification");
    //   }
    //   else if (Notification.permission === "granted") {
    //     let notification = new Notification(`${tx.symbol} - ${tx.value}`);
    //     return;
    //   }
    //   else if (Notification.permission !== "denied") {
    //     Notification.requestPermission().then(function (permission) {
    //       // If the user accepts, let's create a notification
    //       if (permission === "granted") {
    //         vm.$emit("success", "Notification granted!");
    //         let notification = new Notification(`${tx.symbol} - ${tx.value}`);
    //         notification.onclick = function(event) {
    //           event.preventDefault();
    //           window.open(vm.txLink(tx.txHash));
    //         }
    //       }
    //     });
    //   }
    //   vm.$emit("info", "Please allow to receive notification.");
    // }
  }
};
</script>

<style scoped>

.textEnd {
  text-align: end;
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
</style>
