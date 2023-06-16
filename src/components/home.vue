<template>
  <div class="row">
    <div class="col text-center">
      <h1>Greetings {{authUser.handle}}, Welcome to Cyclopia</h1>
      <p>Build a deck here: <a href="https://deckstats.net/" target="_blank">Deckstats</a></p>
    </div>
  </div>

  <h4 v-if="functions.isEmpty(decks)">You have no decks yet. Go <router-link :to="{name: 'import'}">here</router-link> to import.</h4>
  <template v-else>
    <div class="row">
      <div class="col text-center">
        <h2>Challenges</h2>
      </div>
    </div>

    <div class="row">
      <div class="col-4">
        <h4>Received</h4>
        <p v-if="functions.isEmpty(received)">You have no received challenges</p>

        <form v-for="invitation in received" class="row" @submit.prevent="() => accept(invitation)">
          <div class="col-8">
            <table class="table table-dark table-striped table-hover align-middle mb-0">
              <tbody>
                <tr class="small">
                  <td class="text-warning">{{functions.localeDateTime(invitation.created_on)}}</td>
                  <td>{{invitation.handle}} against {{invitation.deck_name}}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Input
            v-model="received_deck_id"
            type="select"
            id="deckRec"
            class="col-4"
            name="received_deck_id"
            placeholder="Select a Deck"
            :has-label="false"
          >
            <template #options>
              <option v-for="{id, name} in decks" :value="id">{{name}}</option>
            </template>
          </Input>

          <div class="col-4 offset-8 justify-content-between hstack">
            <button type="submit" class="btn btn-success">Accept</button>
            <button
              type="button"
              class="btn btn-danger"
              @click="() => decline(invitation)"
            >Decline</button>
          </div>
        </form>
      </div>

      <div class="col-4">
        <h4>Sent</h4>
        <p v-if="functions.isEmpty(sent)">You have no pending challenges</p>

        <table v-else class="table table-dark table-striped table-hover table-sm align-middle">
          <tbody>
            <tr v-for="invitation in sent" class="small">
              <td class="text-warning">{{functions.localeDateTime(invitation.created_on)}}</td>
              <td>{{invitation.handle}} against {{invitation.deck_name}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="col-4">
        <h4>Send</h4>

        <form class="row" @submit.prevent="create">
          <Input
            v-model="send_deck_id"
            type="select"
            id="deckSend"
            class="col-6"
            name="send_deck_id"
            placeholder="Select a Deck"
          >
            <template #label>Deck</template>
            <template #options>
              <option v-for="{id, name} in decks" :value="id">{{name}}</option>
            </template>
          </Input>
          <Input
            v-model="user_id"
            type="select"
            id="userSend"
            class="col-6"
            name="user_id"
            placeholder="Select a User"
          >
            <template #label>User</template>
            <template #options>
              <option v-for="{id, handle} in users" :value="id">{{handle}}</option>
            </template>
          </Input>
          <div class="col">
            <button type="submit" class="btn btn-primary">Send Challenge</button>
          </div>
        </form>
      </div>
    </div>

    <div class="row">
      <div class="col text-center">
        <h2>Games</h2>
      </div>
    </div>

    <div class="row">
      <div class="col-4">
        <h4>Spectate</h4>
        <p v-if="functions.isEmpty(otherGames)">No ongoing games</p>

        <table v-else class="table table-dark table-striped table-hover table-sm align-middle">
          <tbody>
            <tr v-for="game in otherGames" class="pointer small" @click="spectate(game.id)">
              <td class="text-warning">{{functions.localeDateTime(game.created_on)}}</td>
              <td>{{format(game.users)}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="col-4">
        <h4>Ongoing</h4>
        <p v-if="functions.isEmpty(ongoing)">You have no onging games</p>

        <table v-else class="table table-dark table-striped table-hover table-sm align-middle">
          <tbody>
            <tr v-for="game in ongoing" class="pointer small" @click="join(game.id)">
              <td class="text-warning">{{functions.localeDateTime(game.created_on)}}</td>
              <td>{{format(game.users)}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="col-4">
        <h4>Completed</h4>
        <p v-if="functions.isEmpty(completed)">You have no completed games</p>

        <table v-else class="table table-dark table-striped table-hover table-sm align-middle">
          <tbody>
            <tr v-for="game in completed" class="small">
              <td class="text-warning">{{functions.localeDateTime(game.created_on)}}</td>
              <td><i v-if="game.winner === authUser.id" class="bi bi-trophy-fill text-warning"></i></td>
              <td>{{format(game.users)}}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>
</template>

<script>
  import Input from './input.vue'

  export default {
    components: {
      Input,
    },
    data: () => ({
      decks: [],
      received_deck_id: null,
      send_deck_id: null,
      users: [],
      user_id: null,
    }),
    created() {
      this.fetch.get('/decks', {}, ({data}) => this.decks = data.map(this.factory.deck))
      this.fetch.get('/users', {}, ({data}) => this.users = data.filter(({id}) => id !== this.authUser.id))
      this.fetch.get('/games')
      this.fetch.get('/invitations')
    },
    computed: {
      challenges() {
        return this.store.get('challenges')
      },
      games() {
        return this.store.get('games')
      },
      invitations() {
        return this.store.get('invitations')
      },
      otherGames() {
        return this.games.filter(({users, winner}) => this.functions.isNull(winner) && users.every(({user_id}) => user_id !== this.authUser.id))
      },
      userGames() {
        return this.games.filter(({users}) => users.some(({user_id}) => user_id === this.authUser.id))
      },
      ongoing() {
        return this.userGames.filter(({winner}) => this.functions.isNull(winner))
      },
      completed() {
        return this.userGames.filter(({winner}) => this.functions.isNotNull(winner))
      },
      received() {
        return this.invitations.filter(({type}) => type === 'received')
      },
      sent() {
        return this.invitations.filter(({type}) => type === 'sent')
      },
    },
    methods: {
      format([a, b]) {
        return `${a.user_id === this.authUser.id ? 'You' : a.handle} with ${a.deck} vs ${b.user_id === this.authUser.id ? 'You' : b.handle} with ${b.deck}`
      },
      create() {
        this.fetch.post('/invitations', {deck_id: this.send_deck_id, user_id: this.user_id}, () => {
          this.send_deck_id = null
          this.user_id = null
        })
      },
      accept({id, opponent_id}) {
        this.fetch.put('/games', {deck_id: this.received_deck_id, id, opponent_id}, () => this.received_deck_id = null)
      },
      decline({id, opponent_id}) {
        this.fetch.del('/invitations', {id, opponent_id})
      },
      join(id) {
        this.$router.push({name: 'game', params: {id}})
      },
      spectate(id) {
        this.$router.push({name: 'spectate', params: {id}})
      },
      copy(id) {
        navigator.clipboard.writeText(`${window.location.origin}/${this.$router.resolve({name: 'game', params: {id}}).href}`)
        this.store.setSuccessMessage('Link copied to clipboard')
      },
    },
  }
</script>