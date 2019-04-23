/* eslint-disable no-debugger */
/* eslint-disable no-console */
export default {
  stopTicker: false,
  stop() {
    this.stopTicker = true;
  },
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
        if (vm.isPaused || (!vm.isActivated && vm.symbols.every(s => s.set))) {
          // sleep
          if (callback) callback();
          tick(vm.tickRate, () => {
            // vm.log("Pausing...");
          });
          return;
        }
        if (vm.isConfigValid) {
          await vm.REFRESH_EXCHANGE_INFO();
          // do stuff
          vm.trends = [];
          vm.isLoading = true;
          vm.rates = await vm.GET_RATE();
          for (let index = 0; index < vm.symbols.length; index++) {
            const sym = vm.symbols[index];
            let rate = vm.getRate(sym.symbol);
            // should not happen
            if (!rate) {
              vm.log(`Critital error: Can not find rate for ${sym.symbol}`);
              vm.log(`Stop...`);
              this.stopTicker = true;
              return;
            }
            sym.trend = rate > sym.price ? 1 : rate.price == sym.price ? 0 : -1;
            // update
            sym.price = rate;
            sym.dif = (sym.alarm / rate) * 100 - 100;
            sym.difPercentage = new Number(sym.dif).toPrecision(4);
            // sound the alarm
            vm.soundAlarm(sym);
          }
          // done
          vm.isLoading = false;
        } else {
          //   vm.log("Invalid config");
        }
        //sleep
        tick(vm.tickRate, () => {
          // vm.log("Done routine...");
        });
        if (callback) callback();
      }, delay);
    };
    tick(0);
  }
};
