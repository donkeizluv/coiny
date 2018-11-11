<template>
  <v-app dark>
    <v-snackbar :timeout="5000"
        top
        multi-line
        :color="snackType"
        v-model="snackbar">
        {{ snackMessage }}
        <v-btn flat @click.native="snackbar = false">X</v-btn>
    </v-snackbar>
    <v-dialog v-model="errorDialog" persistent max-width="290">
      <v-btn slot="activator" color="primary" dark>Open Dialog</v-btn>
      <v-card>
        <v-card-title class="headline">Error :(</v-card-title>
        <v-card-text>App initalization failed. Please try again after sometimes.</v-card-text>
      </v-card>
    </v-dialog>
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <span>Coiny</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn flat @click="currentView = 'TxView'">
        <span class="mr-2">App</span>
      </v-btn>
      <v-btn flat @click="currentView = 'ConfigView'">
        <span class="mr-2">Config</span>
      </v-btn>
    </v-toolbar>

    <v-content class="no-padding">
       <v-fade-transition mode='out-in'>
         <keep-alive>
           <view :is="currentView"
              @error="showError"
              @info="showInfo"
              @success="showSuccess"></view>
         </keep-alive>
        </v-fade-transition>
    </v-content>
  </v-app>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import TxView from "./components/TxView";
import ConfigView from "./components/ConfigView";

export default {
  name: "App",
  components: {
    TxView,
    ConfigView
  },
  async created() {
    try {
      await this.INIT();
      if (this.ready) {
        // set view to tx if everything is ok
        this.currentView = "TxView";
      }
    } catch (error) {
      console.log(error);
      this.errorDialog = true;
    }
  },
  computed: {
    ...mapGetters(["ready"])
  },
  data() {
    return {
      errorDialog: false,
      snackbar: false,
      snackMessage: "",
      snackType: "info",
      currentView: "TxView"
    };
  },
  methods: {
    ...mapActions(["INIT", "REFRESH_MASTER_RATES", "REFRESH_MAX_BLOCK_HEIGHT"]),
    showError: function(mess) {
      this.snackbar = true;
      this.snackType = "error";
      this.snackMessage = mess;
    },
    showSuccess: function(mess) {
      this.snackbar = true;
      this.snackType = "success";
      this.snackMessage = mess;
    },
    showInfo: function(mess) {
      this.snackbar = true;
      this.snackType = "info";
      this.snackMessage = mess;
    }
  }
};
</script>
<style scoped>
  .no-padding {
    padding: 0!important;
  }
</style>

