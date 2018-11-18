export default {
  stopTicker: false,
  stop() {
    this.stopTicker = true;
  },
  //TODO: vm as a interface
  start(vm) {
    this.stopTicker = false;
    const tick = delay => {
      setTimeout(async () => {
        if (this.stopTicker) {
          vm.log("Stopping...");
          // kill this closure
          vm.RUNNING(false);
          return;
        }
        if (vm.isPaused) {
          tick(vm.txInterval);
        }
        if (vm.isConfigValid) {
          // vm.log("Start polling");
          vm.localLoading = true;
          await vm.REFRESH_MASTER_RATES();
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
              if (t.tokenDecimal) continue;
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
            let items = vm.convertToItems(result);
            // notify
            items.forEach(i => {
              if (i.value > vm.minValue) vm.ALERT(i);
            });
            vm.items.push(...items);
            vm.localLoading = false;
          }
        } else {
          vm.log("Invalid config");
        }
        //sleep
        tick(vm.txInterval);
      }, delay);
    };
    tick(0);
  }
};
