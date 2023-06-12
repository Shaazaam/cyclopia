import {createApp, reactive, nextTick} from 'vue'
import {createRouter, createWebHashHistory} from 'vue-router'

import App from './app.vue'
import Admin from './components/admin.vue'
import Decks from './components/decks.vue'
import Game from './components/game.vue'
import Home from './components/home.vue'
import Import from './components/import.vue'
import Login from './components/login.vue'
import Logout from './components/logout.vue'
import Profile from './components/profile.vue'
import Register from './components/register.vue'
import Spectate from './components/spectate.vue'

import * as factory from '../util/factory.js'
import fetch from '../util/fetch.js'
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
      main: () => isLoggedIn(),
      callback: () => {
        if (!isLoggedIn()) {
          return {
            name: 'login',
          }
        }
      },
    },
  },
  {
    path: '/admin',
    name: 'admin',
    component: Admin,
    meta: {
      main: () => isLoggedIn() && user().is_admin,
      callback: () => {
        if (!isLoggedIn()) {
          return {
            name: 'login',
          }
        }
        if (!user().is_admin) {
          return false
        }
      },
    },
  },
  {
    path: '/decks',
    name: 'decks',
    component: Decks,
    meta: {
      main: () => isLoggedIn(),
      callback: () => {
        if (!isLoggedIn()) {
          return {
            name: 'login',
          }
        }
      },
    },
  },
  {
    path: '/game/:id',
    name: 'game',
    component: Game,
    props: true,
    meta: {
      main: () => false,
      callback: async (to) => {
        if (!isLoggedIn()) {
          return {
            name: 'login',
          }
        }
        let ret = true
        await fetch.get('/game-users', [to.params.id], ({data}) => {
          if (!data.some(({user_id}) => user_id === user().id)) {
            ret = {
              name: 'spectate',
              params: {id: to.params.id},
            }
          }
        })
        return ret
      },
    },
  },
  {
    path: '/import',
    name: 'import',
    component: Import,
    meta: {
      main: () => isLoggedIn(),
      callback: () => {
        if (!isLoggedIn()) {
          return {
            name: 'login',
          }
        }
      },
    },
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      main: () => !isLoggedIn(),
      callback: () => true,
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: Profile,
    meta: {
      main: () => isLoggedIn(),
      callback: () => {
        if (!isLoggedIn()) {
          return {
            name: 'login',
          }
        }
      },
    },
  },
  {
    path: '/spectate/:id',
    name: 'spectate',
    component: Spectate,
    props: true,
    meta: {
      main: () => false,
      callback: async (to) => {
        if (!isLoggedIn()) {
          return {
            name: 'login',
          }
        }
        let ret = true
        await fetch.get('/game-users', [to.params.id], ({data}) => {
          if (data.some(({user_id}) => user_id === user().id)) {
            ret = {
              name: 'game',
              params: {id: to.params.id},
            }
          }
        })
        return ret
      },
    },
  },
  {
    path: '/logout',
    name: 'logout',
    component: Logout,
    meta: {
      main: () => isLoggedIn(),
      callback: () => {
        if (!isLoggedIn()) {
          return {
            name: 'login',
          }
        }
      },
    },
  },
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: {
      main: () => !isLoggedIn(),
      callback: () => true,
    },
  },
]
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
router.beforeEach(async (to, from) => {
  store.set('inputErrors', [])
  const next = await to.meta.callback(to)
  return next
})
router.afterEach(({name}, from) => nextTick(() => document.title = `Cyclopia | ${functions.toUpperCaseWords(name)}`))

const vstore = reactive({
  message: undefined,
  isSaving: undefined,
  isLoading: undefined,
  inputErrors: undefined,
  user: undefined,
  game: undefined,
  games: undefined,
  invitations: undefined,
  events: undefined,

  set: (key, value) => store.set(key, value),
  get(key) {return this[key]},

  setSuccessMessage(message) {
    this.set('message', {kind: 'success', message})
    setTimeout(() => this.clearMessage(), 4 * 1000)
  },
  setErrorMessage(message) {
    this.set('message', {kind: 'error', message})
    setTimeout(() => this.clearMessage(), 4 * 1000)
  },
  clearMessage() {this.set('message', null)},

  setUser(x) {this.set('user', x)},
  clearUser() {this.set('user', factory.user(user()))},
})

store.set('message', null, (key, value) => vstore[key] = value)
store.set('isSaving', false, (key, value) => vstore[key] = value)
store.set('isLoading', false, (key, value) => vstore[key] = value)
store.set('inputErrors', [], (key, value) => vstore[key] = value)
store.set('user', factory.user(user()), (key, value) => vstore[key] = value)
store.set('game', {}, (key, value) => vstore[key] = value)
store.set('games', [], (key, value) => vstore[key] = value)
store.set('invitations', [], (key, value) => vstore[key] = value)
store.set('events', [], (key, value) => vstore[key] = value)

app.config.unwrapInjectedRef = true

app.use(router)
  .directive('click-outside', {
    beforeMount: (el, binding) => {
      el.clickOutsideEvent = (event) => {
        if (!el.contains(event.target)) {
          binding.value()
        }
      }
      document.addEventListener('click', el.clickOutsideEvent)
    },
    unmounted: (el) => {
      document.removeEventListener('click', el.clickOutsideEvent)
    },
  })
  .mixin({
    data: () => ({
      factory,
      fetch,
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
      isSaving() {
        return this.store.get('isSaving')
      },
      isLoading() {
        return this.store.get('isLoading')
      },
      errors() {
        const [errors] = this.store.get('inputErrors')
        return errors
      },
    },
  })
  .mount('#app')
