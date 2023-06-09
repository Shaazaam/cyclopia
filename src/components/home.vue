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

        <form v-for="invitation in received" @submit.prevent="() => accept(invitation)">
          <Input
            v-model="received_deck_id"
            type="select"
            id="deckRec"
            name="received_deck_id"
            placeholder="Select a Deck"
          >
            <template #label>
              <span class="small text-warning">{{functions.localeDateTime(invitation.created_on)}}</span>
              {{invitation.handle}} with {{invitation.deck_name}}
            </template>
            <template #options>
              <option v-for="{id, name} in decks" :value="id">{{name}}</option>
            </template>
          </Input>
          <div class="d-flex justify-content-between">
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

        <div v-for="invitation in sent" class="row">
          <div class="col">
            <p>
              <span class="small text-warning">{{functions.localeDateTime(invitation.created_on)}}</span>
              {{invitation.handle}} against {{invitation.deck_name}}
            </p>
          </div>
        </div>
      </div>

      <div class="col-4">
        <h4>Send</h4>

        <form @submit.prevent="create">
          <Input
            v-model="send_deck_id"
            type="select"
            id="deckSend"
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
            name="user_id"
            placeholder="Select a User"
          >
            <template #label>User</template>
            <template #options>
              <option v-for="{id, handle} in users" :value="id">{{handle}}</option>
            </template>
          </Input>
          <button type="submit" class="btn btn-primary float-end">Send Challenge</button>
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
        <h4>Ongoing</h4>
        <p v-if="functions.isEmpty(ongoing)">You have no onging games</p>

        <div v-for="game in ongoing" class="mb-3">
          <div class="row">
            <div class="col">
              <p>
                <span class="small text-warning">{{functions.localeDateTime(game.created_on)}}: </span>{{format(game.users)}}
              </p>
            </div>
          </div>
          <div class="d-flex justify-content-between">
            <router-link class="btn btn-primary" :to="{name: 'game', params: {id: game.id}}">Join</router-link>
            <button type="button" class="btn btn-primary" @click="copy(game.id)">Copy Link</button>
          </div>
        </div>
      </div>

      <div class="col-4">
        <h4>Completed</h4>
        <p v-if="functions.isEmpty(completed)">You have no completed games</p>

        <div v-for="game in completed" class="row">
          <div class="col">
            <p>
              <span class="small text-warning">{{functions.localeDateTime(game.created_on)}}: </span>
              {{format(game.users)}} <i v-if="game.winner === authUser.id" class="bi bi-trophy-fill text-warning"></i>
            </p>
          </div>
        </div>
      </div>

      <div class="col-4">
        <h4>Spectate</h4>
        <p v-if="functions.isEmpty(otherGames)">No ongoing games</p>

        <div v-for="game in otherGames" class="mb-3">
          <div class="row">
            <div class="col">
              <p>
                <span class="small text-warning">{{functions.localeDateTime(game.created_on)}}: </span>{{format(game.users)}}
              </p>
            </div>
          </div>
          <div class="d-flex justify-content-between">
            <router-link class="btn btn-primary" :to="{name: 'spectate', params: {id: game.id}}">Spectate</router-link>
            <button type="button" class="btn btn-primary" @click="copy(game.id)">Copy Link</button>
          </div>
        </div>
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
      copy(id) {
        navigator.clipboard.writeText(`${window.location.origin}/${this.$router.resolve({name: 'game', params: {id}}).href}`)
        this.store.setSuccessMessage('Link copied to clipboard')
      },
    },
  }
</script>