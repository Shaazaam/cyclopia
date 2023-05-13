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
        <p v-if="functions.isEmpty(challenges.invitations)">You have no received challenges</p>

        <form v-for="invitation in challenges.invitations" @submit.prevent="() => accept(invitation)">
          {{invitation.created_on}} vs {{invitation.opponent.handle}}
          <div class="row mb-3">
            <label for="deck" class="col-2 col-form-label">Pick a Deck</label>
            <div class="col-10">
              <Select v-model="recieved_deck_id" id="deckRec" name="recieved_deck_id">
                <template #options>
                  <option v-for="{id, name} in decks" :value="id">{{name}}</option>
                </template>
              </Select>
            </div>
          </div>
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
        <p v-if="functions.isEmpty(challenges.pending)">You have no pending challenges</p>

        <div v-for="game in challenges.pending" class="row">
          <div class="col">
            <p>{{game.created_on}} vs {{game.opponent.handle}}</p>
          </div>
        </div>
      </div>

      <div class="col-4">
        <h4>Send</h4>

        <form @submit.prevent="create">
          <div class="row mb-3">
            <label for="deck" class="col-2 col-form-label">Deck</label>
            <div class="col-10">
              <Select v-model="send_deck_id" id="deckSend" name="send_deck_id">
                <template #options>
                  <option v-for="{id, name} in decks" :value="id">{{name}}</option>
                </template>
              </Select>
            </div>
          </div>

          <div class="row mb-3">
            <label for="user" class="col-2 col-form-label">User</label>
            <div class="col-10">
              <Select v-model="user_id" id="userSend" name="user_id">
                <template #options>
                  <option v-for="{id, handle} in users" :value="id">{{handle}}</option>
                </template>
              </Select>
            </div>
          </div>

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
        <p v-if="functions.isEmpty(challenges.active)">You have no onging games</p>

        <div v-for="game in challenges.active" class="mb-3">
          <div class="row">
            <div class="col">
              <p>{{game.created_on}} vs {{game.opponent.handle}}</p>
            </div>
          </div>
          <div class="d-flex justify-content-between">
            <router-link class="btn btn-primary" :to="{name: 'game', params: {id: game.game_id}}">Join</router-link>
            <button type="button" class="btn btn-primary" @click="copy(game.game_id)">Copy Link</button>
          </div>
        </div>
      </div>

      <div class="col-4">
        <h4>Completed</h4>
        <p v-if="functions.isEmpty(challenges.completed)">You have no completed games</p>

        <div v-for="game in challenges.completed" class="row">
          <div class="col">
            <p>{{game.created_on}} vs {{game.opponent.handle}} <i v-if="game.winner === authUser.id" class="bi bi-trophy-fill text-warning"></i></p>
          </div>
        </div>
      </div>

      <div class="col-4">
        <h4>Spectate</h4>
        <p>Coming Soon (TM)</p>
      </div>
    </div>
  </template>
</template>

<script>
  import Select from './select.vue'

  export default {
    components: {
      Select,
    },
    data: () => ({
      decks: [],
      recieved_deck_id: null,
      send_deck_id: null,
      users: [],
      user_id: null,
    }),
    created() {
      this.fetch.get('/decks', {}, (data) => this.decks = data.map(this.factory.deck))
      this.fetch.get('/users', {}, (data) => {
        this.users = data.filter(({id}) => id !== this.authUser.id)
        if (this.functions.isNotObjectEmpty(this.challenges)) {
          this.users = this.users.filter(({id}) => ! this.challenges.pending.map(({opponent}) => opponent.id).includes(id))
        }
      })
      this.fetch.get('/challenges')
    },
    computed: {
      challenges() {
        return this.store.get('challenges')
      },
    },
    watch: {
      challenges({pending}) {
        this.users = this.users.filter(({id}) => ! pending.map(({opponent}) => opponent.id).includes(id))
      },
    },
    methods: {
      create() {
        this.fetch.post('/challenges', {deck_id: this.send_deck_id, user_id: this.user_id})
      },
      accept({game_id, opponent: {id: opponent_id}}) {
        this.fetch.put('/challenges', {deck_id: this.recieved_deck_id, game_id, opponent_id})
      },
      decline({game_id, opponent: {id: opponent_id}}) {
        this.fetch.del('/challenges', {game_id, opponent_id})
      },
      copy(id) {
        navigator.clipboard.writeText(`${window.location.origin}/${this.$router.resolve({name: 'game', params: {id}}).href}`)
        this.store.setSuccessMessage('Link copied to clipboard')
      },
    },
  }
</script>