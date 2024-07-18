<template>
  <fieldset v-if="error" class="configure-together-container">
    {{ error }}
  </fieldset>
  <fieldset v-if="socket" class="configure-together-container">
    {{ greeting }}
    <div>
      <button @click="copyURL">
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM240-440q17 0 28.5-11.5T280-480q0-17-11.5-28.5T240-520q-17 0-28.5 11.5T200-480q0 17 11.5 28.5T240-440Zm480 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Zm0-600ZM240-480Zm480 280Z"/></svg>
        <span>Copy Invite Link</span>
      </button>
      <button v-if="isHost" @click="endSession" id="stopConfigureTogether">
        <span>Stop Sharing</span>
      </button>
    </div>
  </fieldset>
  <button v-else class="configure-together-btn" @click="createSession">
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M40-160v-160q0-34 23.5-57t56.5-23h131q20 0 38 10t29 27q29 39 71.5 61t90.5 22q49 0 91.5-22t70.5-61q13-17 30.5-27t36.5-10h131q34 0 57 23t23 57v160H640v-91q-35 25-75.5 38T480-200q-43 0-84-13.5T320-252v92H40Zm440-160q-38 0-72-17.5T351-386q-17-25-42.5-39.5T253-440q22-37 93-58.5T480-520q63 0 134 21.5t93 58.5q-29 0-55 14.5T609-386q-22 32-56 49t-73 17ZM160-440q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T280-560q0 50-34.5 85T160-440Zm640 0q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T920-560q0 50-34.5 85T800-440ZM480-560q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-680q0 50-34.5 85T480-560Z"/></svg>
    <span>Configure Together</span>
  </button>
</template>

<script>
import * as ArtmartService from "@/services/ArtmartService";

export default {
  name: "ConfigureTogether",
  props: {
    artworkId: Number,
    sessionId: String,
    config: Object,
    didBuy: Boolean
  },
  emits: ["isHost", "update:config", "update:sessionId"],
  data() {
    return {      
      isHost: false,
      error: null,
      socket: null,      
      myUsername: null,
      allUsernames: [],
      isUpdatingState: false
    }
  },
  computed: {
    greeting() {
      const prettyList = (xs) => xs.join(', ').replace(/,([^,]*)$/, ' and$1');
      const host = this.allUsernames[0];
      const guests = this.allUsernames.slice(1);
      let s = `Hello ${this.myUsername}. `
      // TODO: complete greeting
      return s;
    }
  },
  watch: {
    config: {
      deep: true,
      handler() {
        if (!this.isUpdatingState) {
          // TODO: update shared session state on server
        }
      },
    },
    sessionId: {
      async handler() {
        if (!this.socket && this.sessionId) {
          await this.joinSession();
        }
      }
    },
    socket: {
      handler() {
        if (!this.socket) return;
        this.error = null;
        this.socket.onmessage = (rawMsg) => {
          const msg = JSON.parse(rawMsg.data);
          // console.log(msg)
          this.onMessage(msg); 
        }
        this.socket.onerror = (e) => {
          this.error = "socket error";
        };
        this.socket.onclose = () => {
          this.socket = null;
          this.username = null;
          this.allUsernames = [];
          this.$emit("update:sessionId", null);
        }
      }
    }
  },
  methods: {
    async joinSession() {
      this.updateIsHost(false);      
      this.socket = null;  // TODO: join shared session as guest
    },
    async createSession() {
      this.updateIsHost(true);
      this.socket = await ArtmartService.openSocket("TO/DO");  
      // TODO: create and initialize new shared session as host
    },
    onMessage(msg) {
      // TODO: complete these stubs
      switch (msg.op) {
        case "ready":        
          this.$emit("update:sessionId", msg.data.sessionId);
          break;
        case "update_state":
          this.isUpdatingState = true;
          this.$emit("update:config", msg.data);
          this.$nextTick(() => {
            this.isUpdatingState = false;
          })
          break;
        case "error":
          this.error = msg.data.message;
          this.socket?.close()
          break;
      }
    },
    endSession() {
      // TODO
      this.socket?.close();
    },
    copyURL() {
      navigator.clipboard.writeText(window.location);
    },
    updateIsHost(isHost) {
      this.isHost = isHost;
      this.$emit('isHost', isHost);
    }
  },
  beforeUnmount() {    
    this.endSession();
  }
};
</script>

<style scoped>
.configure-together-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  background-color: hsl(250 80% 70%);
  fill: var(--bg-color)
}

.configure-together-container {
  background-color: rgba(138, 117, 240);
  color: white;
}

.configure-together-container svg {
  fill: white;
}

.configure-together-container button {
  background-color: rgba(138, 117, 240);
  border: 1px solid white;
  border-radius: 8px;
  height: auto;
  padding: 0.25em 1em;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 1em;  
}

.configure-together-container > div {
  display: flex;
  justify-content: space-between;
}
</style>
