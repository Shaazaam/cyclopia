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
            {{functions.toUpperCaseWords(name)}}
          </router-link>
        </li>
      </ul>
    </div>
  </nav>
  <div class="sticky-top">
    <div class="toast-container top-0 end-0 px-3">
      <Transition name="fade">
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
      </Transition>
    </div>
  </div>
  <div class="container-fluid" :class="{'invisible': isLoading}" v-cloak>
    <!-- <div v-if="isLoading" class="d-flex justify-content-center hstack gap-3">
      <div class="spinner-lg spinner-grow text-danger" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div v-if="icon1" class="spinner-lg spinner-grow text-danger" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div v-if="icon2" class="spinner-lg spinner-grow text-danger" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div> -->
    <router-view />
  </div>
</template>

<script>
  export default {
    data: () => ({
      routes: null,
      icon1: false,
      icon2: false,
    }),
    created() {
      this.routes = this.$router.getRoutes().filter(({meta}) => meta.main())
    },
    computed: {
      alert() {
        return this.store.get('message')
      },
    },
    watch: {
      isLoggedIn() {
        this.routes = this.$router.getRoutes().filter(({meta}) => meta.main())
      },
      isLoading(x) {
        if (x) {
          setTimeout(() => this.icon1 = true, 200)
          setTimeout(() => this.icon2 = true, 400)
        }
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
  .sticky-top {
    top: 2.5%;
  }
  .tapped {
    transform: rotate(315deg);
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
  .contain-height {
    object-fit: contain;
    height: 25vh;
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
  .spinner-lg {
    width: 4rem;
    height: 4rem;
  }
  .invalid-feedback {
    margin-top: unset;
    margin-bottom: 0.5rem;
  }
</style>