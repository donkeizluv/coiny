<template>
  <v-container>
    <v-layout class="pt-5" align-center justify-center row fill-height wrap>
      <v-flex xs3>
        <v-text-field
          v-model="pwd"
          color="green"
          solo
          type="password"
          class="mt-4"
          @keyup.enter="submit"
        ></v-text-field>
      </v-flex>
      <v-flex xs1>
        <v-btn color="green" icon flat small class="ma-2 mt-0" @click="submit">
          <v-icon>
            mdi-account-outline
          </v-icon>
        </v-btn>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapActions } from "vuex";

export default {
  data() {
    return {
      pwd: "",
      message: ""
    };
  },
  methods: {
    ...mapActions(["LOGIN"]),
    async submit() {
      this.message = "";
      let result = await this.LOGIN(this.pwd);
      if (!result) {
        this.message = "Wrong pwd.";
      }
    }
  }
};
</script>

<style></style>
