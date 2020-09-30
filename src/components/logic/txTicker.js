/* eslint-disable no-debugger */
/* eslint-disable no-console */
export default {
  stopTicker: false,
  stop() {
    this.stopTicker = true;
  },
  //TODO: vm as an interface
  start(vm) {
    this.stopTicker = false;
    const tick = (delay, callback) => {
      setTimeout(async () => {
        if (this.stopTicker) {
          vm.log("Stopping...");
          // kill this closure
          vm.isRunning = false;
          return;
        }
        if (vm.isPaused) {
          // sleep
          if (callback) callback();
          tick(vm.txInterval, () => {
            // vm.log("Pausing...");
          });
          return;
        }
        if (vm.isConfigValid) {
          // vm.log("Start polling");
          vm.localLoading = true;
          await vm.REFRESH_COIN_LIST();
          // only fetch tx if height changed
          if (await vm.REFRESH_MAX_BLOCK_HEIGHT()) {
            // init lastRescan
            if (!vm.lastRescan) vm.lastRescan = vm.maxBlockHeight;
            vm.log(`New block height: ${vm.maxBlockHeight}`);
            let { result } = await vm.GET_TX(
              vm.calculateRange(vm.lastHeight, vm.maxBlockHeight)
            );
            // save check point
            vm.lastHeight = vm.maxBlockHeight;
            let txCount = result.length;
            vm.log(`Tx count: ${txCount}`);
            // remove duplicates
            result = result.filter(
              r => !vm.items.some(i => i.txHash === r.hash)
            );
            if (txCount != result.length)
              vm.log(`Ignored ${txCount - result.length} duplicates`);

            // fill missing contract data
            // forEach dont do well with async
            // for-in, for-of cant update the item
            for (let index = 0; index < result.length; index++) {
              const t = result[index];
              if (!t.tokenDecimal) {
                let contract = await vm.GET_CONTRACT(t.contractAddress);
                if (!contract && !contract.error) {
                  vm.log(
                    `ERROR: can not get contract info of ${t.contractAddress}`
                  );
                  continue;
                }
                t.tokenDecimal = contract.decimal;
                t.tokenSymbol = contract.symbol;
              }
              // fill price
              let price = await vm.GET_PRICE_BY_SYMBOL(t.tokenSymbol);
              if (price) {
                t.price = price.usd;
              } else {
                vm.log(`ERROR: could not get market price of ${t.tokenSymbol}`);
              }
            }
            let items = vm.convertToItems(result);
            // notify
            items.forEach(i => {
              if (i.value > vm.minValue) {
                // vm.ALERT(i);
                vm.ALARM({
                  symbol: i.symbol,
                  price: i.price,
                  up: true,
                  at: new Date().toLocaleTimeString()
                });
              }
            });
            vm.items.push(...items);
            vm.localLoading = false;
          }
        } else {
          vm.log("Invalid config");
        }
        //sleep
        tick(vm.txInterval, () => {
          // vm.log("Done routine...");
        });
        if (callback) callback();
      }, delay);
    };
    tick(0);
  }
};
