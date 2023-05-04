<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container-fluid justify-content-center">
      <span class="navbar-brand">
        <img src="android-chrome-192x192.png" width="35" height="35">
      </span>
      <ul class="navbar-nav mb-2 mb-lg-0">
        <li v-for="{name, meta} in routes" class="nav-item">
          <router-link
            :to="{name}"
            class="nav-link"
          >
            {{formatters.toUpperCaseWords(name)}}
          </router-link>
        </li>
      </ul>
    </div>
  </nav>
  <transition name="fade">
    <div class="position-relative">
      <div class="toast-container top-0 end-0 px-3">
        <div
          v-if="functions.isNotNull(alert)"
          class="toast align-items-center border-0"
          :class="{
            'text-bg-success': alert.kind === 'success',
            'text-bg-danger': alert.kind === 'error',
            'show': functions.isNotNull(alert),
          }"
        >
          <div class="d-flex">
            <div class="toast-body">{{alert.message}}</div>
            <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
          </div>
        </div>
      </div>
    </div>
  </transition>
  <div class="container-fluid">
    <router-view v-cloak></router-view>
  </div>
</template>

<script>
  export default {
    computed: {
      alert() {
        return this.store.get('message')
      },
      routes() {
        return this.$router.getRoutes().filter(({meta}) => meta.requiresAuth === this.isLoggedIn && meta.main)
      },
    },
    mounted() {
      if (this.isLoggedIn) {
        this.socket.connect()
      }
    },
  }
</script>

<style>
  [v-cloak] {
    display: none;
  }
  .tapped {
    transform: rotate(270deg);
  }
  .navbar-dark .navbar-nav .nav-link.router-link-active,
  .navbar-dark .navbar-nav .show>.nav-link {
    color: #FFF;
  }
  .card {
    border: none;
    border-radius: unset;
  }
  .card img {
    border-radius: 11px;
  }
  .card .dropdown-center {
    display: inline-grid;
  }
  .card .dropdown-center button {
    text-align: center;
    width: 100%;
  }
  .modal .card img {
    border-radius: 28px;
  }
  .modal-content.bg-transparent {
    border: unset;
  }
  .pointer {
    cursor: pointer;
  }
  .tab-content .card img {
    border-radius: 22px;
  }
  .col-15 {
    flex: 0 0 auto;
    width: 12.499%;
  }
  .col-105 {
    flex: 0 0 auto;
    width: 87.499%;
  }
  .dropdown-menu {
    --bs-dropdown-padding-x: unset;
    --bs-dropdown-padding-y: unset;
  }
  .dropdown-center .input-group-text {
    flex: 3 1;
  }
  .reverse-columns {
    display: flex;
    flex-direction: column-reverse;
  }
</style>