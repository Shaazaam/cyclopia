import {createApp, reactive, nextTick} from 'vue'
import {createRouter, createWebHashHistory} from 'vue-router'

import App from './app.vue'
import Decks from './components/decks.vue'
import Game from './components/game.vue'
import Home from './components/home.vue'
import Import from './components/import.vue'
import Login from './components/login.vue'
import Logout from './components/logout.vue'
import Register from './components/register.vue'
import Profile from './components/profile.vue'

import * as factory from '../util/factory.js'
import fetch from '../util/fetch.js'
import * as formatters from '../util/formatters.js'
import * as functions from '../util/functions.js'
import storage from '../util/storage.js'
import store from '../util/store.js'
import socket from '../util/wsc.js'

const app = createApp(App)
const user = () => storage.get('user')
const isLoggedIn = () => functions.isNotNull(user())

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      requiresAuth: true,
      main: true,
    },
  },
  {
    path: '/decks',
    name: 'decks',
    component: Decks,
    meta: {
      requiresAuth: true,
      main: true,
    },
  },
  {
    path: '/game/:id',
    name: 'game',
    component: Game,
    props: true,
    meta: {
      requiresAuth: true,
      main: false,
    },
  },
  {
    path: '/import',
    name: 'import',
    component: Import,
    meta: {
      requiresAuth: true,
      main: true,
    },
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      requiresAuth: false,
      main: true,
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: Profile,
    meta: {
      requiresAuth: true,
      main: true,
    },
  },
  {
    path: '/logout',
    name: 'logout',
    component: Logout,
    meta: {
      requiresAuth: true,
      main: true,
    },
  },
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: {
      requiresAuth: false,
      main: true,
    },
  },
]
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
router.beforeEach(({meta}, from) => {
  if (meta.requiresAuth && !isLoggedIn()) {
    return {
      name: 'login',
    }
  }
})
router.afterEach(({name}, from) => nextTick(() => document.title = `Cyclopia | ${formatters.toUpperCaseWords(name)}`))

const vstore = reactive({
  message: undefined,
  isSaving: undefined,
  isLoading: undefined,
  inputErrors: undefined,
  user: undefined,
  games: [],
  challenges: {},
  events: [],

  set(key, value) {this[key] = value},
  get(key) {return this[key]},

  setMessage(x) {this.set('message', x)},
  clearMessage() {this.set('message', null)},

  setUser(x) {this.set('user', x)},
  clearUser() {this.set('user', factory.user(user()))},
})

store.set('message', null, (key, value) => vstore[key] = value)
store.set('isSaving', false, (key, value) => vstore[key] = value)
store.set('isLoading', false, (key, value) => vstore[key] = value)
store.set('inputErrors', [], (key, value) => vstore[key] = value)
store.set('user', factory.user(user()), (key, value) => vstore[key] = value)
store.set('games', [], (key, value) => vstore[key] = value)
store.set('challenges', {}, (key, value) => vstore[key] = value)
store.set('events', [], (key, value) => vstore[key] = value)

app.config.unwrapInjectedRef = true

app.use(router)
  .mixin({
    data: () => ({
      factory,
      fetch,
      formatters,
      functions,
      store: vstore,
      socket,
      storage,
    }),
    computed: {
      authUser() {
        return this.store.get('user')
      },
      isLoggedIn() {
        return this.functions.isNotNull(this.store.get('user').id)
      },
    },
  })
  .mount('#app')
