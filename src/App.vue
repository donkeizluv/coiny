<template>
  <v-app dark>
    <v-snackbar v-model="snackbar" :timeout="5000" top :color="snackType">
      {{ snackMessage }}
      <v-btn flat @click.native="snackbar = false">X</v-btn>
    </v-snackbar>
    <v-dialog
      v-if="showAlarm"
      value="true"
      scrollable
      persistent
      max-width="600"
    >
      <v-card>
        <v-card-title class="headline">ALARM</v-card-title>
        <v-container fluid grid-list-md pa-2>
          <v-layout row wrap>
            <v-flex v-for="(item, index) in alarms" :key="index" xs12>
              <v-chip small color="grey">{{ item.symbol }}</v-chip>
              <v-chip small color="orange">{{ item.price }}</v-chip>
              <v-chip v-if="item.up" small color="green">UP</v-chip>
              <v-chip v-else small color="red">DOWN</v-chip>
              {{ item.at }}
            </v-flex>
            <v-flex xs12 class="text-xs-center">
              <v-btn small color="primary" dark @click="clearAlarms"
                >Clear</v-btn
              >
            </v-flex>
          </v-layout>
        </v-container>

        <!-- <v-card-text v-for="(item, index) in alarms" :key="index">
          
        </v-card-text>-->
        <!-- <v-btn small color="primary" @click="clearAlarms" dark>Clear all</v-btn> -->
      </v-card>
    </v-dialog>
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <span>Coiny</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        flat
        :color="currentView === 'AlarmView' ? 'green' : ''"
        @click="currentView = 'AlarmView'"
      >
        <span class="mr-2">Alarm</span>
      </v-btn>
      <v-btn
        flat
        :color="currentView === 'TxView' ? 'green' : ''"
        @click="currentView = 'TxView'"
      >
        <span class="mr-2">Tx Watcher</span>
      </v-btn>
      <v-btn
        flat
        :color="currentView === 'ConfigView' ? 'green' : ''"
        @click="currentView = 'ConfigView'"
      >
        <span class="mr-2">Config</span>
      </v-btn>
    </v-toolbar>

    <v-content>
      <v-fade-transition mode="out-in">
        <keep-alive>
          <view
            :is="currentView"
            ref="view"
            @error="showError"
            @info="showInfo"
            @success="showSuccess"
          ></view>
        </keep-alive>
      </v-fade-transition>
    </v-content>
  </v-app>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
// import TxView from "./components/TxView";
// import ConfigView from "./components/ConfigView";
// import AlarmView from "./components/AlarmView";
const alarmAudio = new Audio("asset/bell.mp3");

export default {
  name: "App",
  components: {
    TxView: () =>
      import(/* webpackChunkName: "components" */ "./components/TxView"),
    ConfigView: () =>
      import(/* webpackChunkName: "components" */ "./components/ConfigView"),
    AlarmView: () =>
      import(/* webpackChunkName: "components" */ "./components/AlarmView")
  },
  data() {
    return {
      alarmDialog: true,
      snackbar: false,
      snackMessage: "",
      snackType: "info",
      currentView: "TxView"
    };
  },
  computed: {
    ...mapGetters(["isConfigValid"]),
    ...mapGetters("alarm", ["alarms"]),
    showAlarm() {
      return this.alarms.length > 0;
    }
  },
  watch: {
    alarms(a) {
      if (a.length > 0) alarmAudio.play();
    }
  },
  async created() {
    await this.INIT();
    if (this.isConfigValid) {
      // this.currentView = "TxView";
      this.currentView = "AlarmView";
    }
    alarmAudio.loop = true;
  },
  methods: {
    ...mapActions(["INIT", "REFRESH_MASTER_RATES", "REFRESH_MAX_BLOCK_HEIGHT"]),
    ...mapActions("alarm", ["CLEAR_ALARMS"]),
    showError(mess) {
      this.snackbar = true;
      this.snackType = "error";
      this.snackMessage = mess;
    },
    showSuccess(mess) {
      this.snackbar = true;
      this.snackType = "success";
      this.snackMessage = mess;
    },
    showInfo(mess) {
      this.snackbar = true;
      this.snackType = "info";
      this.snackMessage = mess;
    },
    clearAlarms() {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
      // does not work
      // if(this.currentView !== "AlarmView")
      //   this.$refs.view.setPause(true);
      this.CLEAR_ALARMS();
    }
  }
};
</script>
<style scoped>
.no-padding {
  padding: 0 !important;
}
</style>
