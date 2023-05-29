<template>
  <div class="sticky-top mb-3">
    <div v-if="functions.isNotEmpty(users)" class="row px-3 mb-3">
      <div
        class="col-4 hstack gap-3"
        :class="{'invisible': !opponent.is_ready}"
      >
        <div class="input-group">
          <span class="input-group-text bg-dark text-light">Life</span>
          <input
            type="text"
            class="form-control bg-dark text-light"
            :value="opponent.life"
            disabled
          />
        </div>
        <div v-for="{name} in userCounters.toReversed()" class="input-group">
          <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
          <input
            type="text"
            class="form-control bg-dark text-light"
            :value="opponent.counters[name]"
            disabled
          />
        </div>
      </div>
      <h4 class="col text-center">
        <i v-if="opponent.is_winner" class="bi bi-trophy-fill text-warning"></i>
        <i v-if="opponent.is_active_turn && !isGameOver" class="bi bi-caret-right-fill text-danger"></i>
          {{opponent.handle}} vs {{user.handle}}
        <i v-if="user.is_active_turn && !isGameOver" class="bi bi-caret-left-fill text-success"></i>
        <i v-if="user.is_winner" class="bi bi-trophy-fill text-warning"></i>
      </h4>
      <div
        class="col-4 hstack gap-3 text-nowrap"
        :class="{'invisible': !user.is_ready}"
      >
        <div v-for="{name} in userCounters" class="input-group">
          <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
          <input
            :type="!isGameOver ? 'number' : 'text'"
            class="form-control"
            :class="!isGameOver ? [] : ['bg-dark', 'text-light']"
            :value="user.counters[name]"
            :disabled="isGameOver"
              @change="(e) => counterOnUser(name, e.target.value)"
          />
        </div>
        <div class="input-group">
          <span class="input-group-text bg-dark text-light">Life</span>
          <input
            :type="!isGameOver ? 'number' : 'text'"
            class="form-control"
            :class="!isGameOver ? [] : ['bg-dark', 'text-light']"
            :disabled="isGameOver"
            :value="user.life"
            @change="(e) => life(e.target.value)"
          />
        </div>
      </div>
    </div>

    <div class="row px-5" :class="{'invisible': isGameOver}">
      <div v-if="!user.is_ready" class="col justify-content-center hstack gap-3">
        <button
          v-if="!user.is_ready && functions.isNotEmpty(user.hand)"
          type="button"
          class="btn btn-success"
          @click="start"
        >Start Game</button>
        <button
          v-if="!user.is_ready && functions.isEmpty(user.hand)"
          type="button"
          class="btn btn-info"
          @click="draw"
        >Draw Hand</button>
        <button
          v-if="!user.is_ready && functions.isNotEmpty(user.hand)"
          type="button"
          class="btn btn-warning"
          @click="mulligan"
        >Mulligan</button>
      </div>
      <div v-else class="col justify-content-center hstack gap-3" :class="{'invisible': isGameOver}">
        <h5 class="mb-0 me-auto">Cards: {{opponent.library_total}}</h5>
        <button
          type="button"
          class="btn btn-danger"
          :class="{'invisible': !user.is_active_turn}"
          @click="endTurn"
        >End Turn</button>
        <Input
          v-model="drawAmount"
          :class="{'invisible': isGameOver}"
          type="number"
          name="draw_amount"
          :min="1"
          :max="user.library_total"
          :has-margin="false"
          :has-label="false"
        >
          <template #inputGroupBefore>
            <button
              type="button"
              class="btn btn-success"
              :disabled="functions.isNull(drawAmount)"
              @click="draw"
            >Draw</button>
          </template>
        </Input>
        <button
          type="button"
          class="btn btn-warning"
          @click="shuffle"
        >Shuffle</button>
        <Input
          v-model="millAmount"
          type="number"
          name="mill_amount"
          :min="1"
          :max="user.library_total"
          :has-margin="false"
          :has-label="false"
        >
          <template #inputGroupBefore>
            <button
              type="button"
              class="btn btn-danger"
              :disabled="functions.isNull(millAmount)"
              @click="mill"
            >Mill</button>
          </template>
        </Input>
        <button
          type="button"
          class="btn btn-info"
          data-bs-toggle="modal"
          data-bs-target="#search"
        >Search</button>
        <Input
          v-model="scryAmount"
          type="number"
          name="scry_amount"
          :min="1"
          :max="user.library_total"
          :has-margin="false"
          :has-label="false"
        >
          <template #inputGroupBefore>
            <button
              type="button"
              class="btn btn-info"
              :disabled="functions.isNull(scryAmount)"
              @click="scry"
            >Scry</button>
          </template>
        </Input>
        <div class="dropdown-center">
          <button
            type="button"
            class="btn btn-info dropdown-toggle"
            :class="{'invisible': isGameOver}"
            data-bs-toggle="dropdown"
            :disabled="isGameOver"
          >Tokens</button>
          <ul class="dropdown-menu bg-dark">
            <li class="py-1">
              <Input
                v-model="token"
                name="token"
                type="text"
                placeholder="Search"
                :has-margin="false"
                :has-label="false"
                @keyup-enter="tokenSearch"
              >
                <template #inputGroupAfter>
                  <button
                    type="button"
                    class="btn btn-success"
                    @click="tokenSearch"
                  >
                    <i class="bi bi-search"></i>
                  </button>
                </template>
              </Input>
            </li>
          </ul>
        </div>
        <button
          type="button"
          class="btn btn-primary"
          data-bs-toggle="offcanvas"
          data-bs-target="#eventLog"
        >Log</button>
        <button
          type="button"
          class="btn btn-danger"
          :class="{'invisible': isGameOver}"
          @click="endGame"
          :disabled="isGameOver"
        >Concede</button>
        <h5 class="mb-0 ms-auto">Cards: {{user.library_total}}</h5>
      </div>
    </div>
  </div>

  <div class="row px-5 mb-3">
    <div class="col-2">
      <div class="row">
        <Card
          v-for="object in opponent.graveyard"
          :object="object"
          class="col-3"
          @expand="expand"
        />
      </div>
    </div>
    <div class="col-2">
      <div class="row">
        <Card
          v-for="object in opponent.exile"
          :object="object"
          class="col-3"
          @expand="expand"
        />
      </div>
    </div>
    <div class="col-2">
      <div class="row">
        <Card
          v-for="object in opponent.remove"
          :object="object"
          :actions="factory.actions({
            move: functions.removeByValue(zones, 'remove'),
          })"
          class="col-3"
          @expand="expand"
          @move="move"
        />
      </div>
    </div>
  </div>

  <div class="reverse-columns">
    <Field
      :objects="opponent.field"
      :actions="factory.actions({stats: true})"
      @expand="expand"
    />
  </div>

  <hr />

  <div class="mt-3">
    <Field
      :objects="user.field"
      :actions="factory.actions({
        counters: cardCounters,
        move: functions.removeByValue(zones, 'field'),
        stats: true,
        tap: true,
      })"
      @counter="counterOnCard"
      @expand="expand"
      @move="move"
      @power="power"
      @tap="tap"
      @toughness="toughness"
      @transform="transform"
    />
  </div>

  <div class="row justify-content-end px-5 mb-3">
    <div class="col-2">
      <div class="row">
        <Card
          v-for="object in user.remove"
          :object="object"
          :actions="factory.actions({
            move: functions.removeByValue(zones, 'remove'),
          })"
          class="col-3"
          @expand="expand"
          @move="move"
        />
      </div>
    </div>
    <div class="col-2">
      <div class="row">
        <Card
          v-for="object in user.exile"
          :object="object"
          :actions="factory.actions({
            counters: cardCounters,
            move: functions.removeByValue(zones, 'graveyard'),
          })"
          class="col-3"
          @counter="counter"
          @expand="expand"
          @move="move"
        />
      </div>
    </div>
    <div class="col-2">
      <div class="row">
        <Card
          v-for="object in user.graveyard"
          :object="object"
          :actions="factory.actions({move: functions.removeByValue(zones, 'graveyard')})"
          class="col-3"
          @expand="expand"
          @move="move"
        />
      </div>
    </div>
  </div>

  <div class="sticky-bottom px-5">
    <div class="d-flex justify-content-center hstack gap-3">
      <Card
        v-for="object in user.hand"
        :object="object"
        :actions="factory.actions({move: functions.removeByValue(zones, 'hand')})"
        contain-height
        @expand="expand"
        @move="move"
        @transform="transform"
      />
    </div>
  </div>

  <div id="card" ref="cardModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-transparent">
        <div class="modal-body">
          <div class="row justify-content-center">
            <Card
              :object="object"
              :actions="factory.actions({expand: false})"
              class="col"
              data-bs-dismiss="modal"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="search" ref="searchModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-fullscreen modal-dialog-centered">
      <div class="modal-content bg-transparent">
        <div class="modal-header bg-dark" @click="closeModal('searchModal')">
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row justify-content-center">
            <Card
              v-for="object in user.library"
              :object="object"
              :actions="factory.actions({
                expand: false,
                move: functions.removeByValue(zones, 'library'),
              })"
              class="col-3 mb-3"
              @move="move"
              @transform="transform"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="scry" ref="scryModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-fullscreen modal-dialog-centered">
      <div class="modal-content bg-transparent">
        <div class="modal-header bg-dark" @click="closeModal('scryModal')">
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row justify-content-center">
            <Card
              v-for="object in scryObjects"
              :object="object"
              :actions="factory.actions({expand: false})"
              class="col-3 mb-3"
            >
              <div class="d-flex justify-content-center hstack gap-3">
                <button type="button" class="btn btn-success" @click="scryTop(object.id)">Top</button>
                <button type="button" class="btn btn-danger" @click="scryBottom(object.id)">Bottom</button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="tokenSearch" ref="tokenModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-fullscreen modal-dialog-centered">
      <div class="modal-content bg-transparent">
        <div class="modal-header bg-dark" @click="closeModal('tokenModal')">
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row justify-content-center">
            <Card
              v-for="object in tokenObjects"
              :object="object"
              :actions="factory.actions({
                expand: false,
                create: true,
              })"
              class="col-3 mb-3"
              @create="tokenCreate"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="gameOver" ref="gameOverModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content bg-dark">
        <div class="modal-header text-center d-block">
          <h2>Defeat</h2>
        </div>
        <div class="modal-body">
          <h4 class="text-center">You have been banished from this realm</h4>
          <img class="img-fluid mx-auto d-block" src="/images/banished.png" />
        </div>
      </div>
    </div>
  </div>

  <div id="eventLog" class="offcanvas offcanvas-start text-bg-dark" data-bs-scroll="true" data-bs-backdrop="false" tabindex="-1">
    <div class="offcanvas-header">
      <h5 class="offcanvas-title">Game Log</h5>
      <button
        type="button"
        class="btn-close btn-close-white"
        data-bs-dismiss="offcanvas"
      ></button>
    </div>
    <div class="offcanvas-body">
      <p v-for="event in events">
        <span class="small text-warning">{{functions.localeDateTime(event.created_on)}}</span>: {{getEventText(event)}}
      </p>
    </div>
  </div>
</template>

<script>
  import {computed} from 'vue'

  import Card from './card.vue'
  import Field from './field.vue'
  import Input from './input.vue'

  export default {
    components: {
      Card,
      Field,
      Input,
    },
    props: {
      id: {
        type: String,
        required: true,
      },
    },
    data: () => ({
      cardModal: null,
      searchModal: null,
      scryModal: null,
      gameOverModal: null,
      tokenModal: null,
      object: {},
      drawAmount: 7,
      millAmount: null,
      scryAmount: null,
      scryObjects: [],
      token: null,
      tokenObjects: [],
      counters: [],
      zones: [],
      cardZones: {
        exile: [],
        field: [],
        graveyard: [],
        hand: [],
        library: [],
        remove: [],
      },
    }),
    provide() {
      return {
        isGameOver: computed(() => this.isGameOver)
      }
    },
    computed: {
      game() {
        return this.store.games.filter((game) => game.id === this.id).pop()
      },
      users() {
        return this.game ? this.game.users.map((user) => this.functions.deepExtend({
          counters: this.userCounters.reduce((agg, {name}) => this.functions.copy(agg, {[name]: 0}), {})
        }, user)) : []
      },
      objects() {
        return this.game ? this.game.objects.map((object) => this.functions.extend(
          object,
          {
            counters: this.functions.mergeObjectArrays(
              this.cardCounters.map(({name}) => ({name, amount: 0})),
              object.counters,
              'name'
            )
          }
        )) : []
      },
      counts() {
        return this.game ? this.game.counts : []
      },
      user() {
        return this.functions.deepExtend(
          this.zones.reduce((agg, name) =>
            this.functions.copy(
              agg,
              {
                [name]: agg[name].concat(
                  this.objects
                    .filter((object) => object.user_id === this.authUser.id)
                    .filter((object) => object.zone === name)
                    .sort(({position: a}, {position: b}) => this.functions.sortNumber(a, b))
                    /*.sort(({position: aPos, card_id: aId}, {position: bPos, card_id: bId}) => {
                      if (aId > bId) return 1
                      if (aId < bId) return -1
                      if (aPos > bPos) return 1
                      if (aPos < bPos) return -1
                      //return this.functions.sortString(aId, bId) - this.functions.sortNumber(aPos, bPos)
                    })*/
                ),
              }
            ),
            this.cardZones
          ),
          this.users.find((user) => user.user_id === this.authUser.id),
          this.counts.find((count) => count.user_id === this.authUser.id)
        )
      },
      opponent() {
        return this.functions.deepExtend(
          this.zones.reduce((agg, name) =>
            agg = this.functions.copy(
              agg,
              {
                [name]: agg[name].concat(
                  this.objects
                    .filter((object) => object.user_id !== this.authUser.id)
                    .filter((object) => object.zone === name)
                    .sort(({position: a}, {position: b}) => this.functions.sortNumber(a, b))
                  ),
              }
            ),
            this.cardZones
          ),
          this.users.find((user) => user.user_id !== this.authUser.id),
          this.counts.find((count) => count.user_id !== this.authUser.id)
        )
      },
      cardCounters() {
        return this.counters.filter((counter) => counter.kind === 'card')
      },
      userCounters() {
        return this.counters.filter((counter) => counter.kind === 'user')
      },
      isGameOver() {
        return this.user.is_winner || this.opponent.is_winner
      },
      events() {
        return this.store.events
      },
    },
    created() {
      this.fetch.get('/counters', {}, ({data}) => this.counters = data)
      this.fetch.get('/zones', {}, ({data}) => {
        this.zones = data.map(({name}) => name)
        //this.cardZones = this.zones.reduce((agg, name) => agg = this.functions.copy(agg, {[name]: []}), {})
      })
      this.fetch.get('/game', [this.id])
      this.fetch.get('/events', [this.id])
      this.object = this.factory.object()
    },
    mounted() {
      this.cardModal = new bootstrap.Modal(this.$refs.cardModal)
      this.searchModal = new bootstrap.Modal(this.$refs.searchModal)
      this.scryModal = new bootstrap.Modal(this.$refs.scryModal)
      this.tokenModal = new bootstrap.Modal(this.$refs.tokenModal)
      this.gameOverModal = new bootstrap.Modal(this.$refs.gameOverModal, {backdrop: 'static', keyboard: false})
    },
    watch: {
      drawAmount(amount) {
        this.drawAmount = this.determineAmount(amount)
      },
      millAmount(amount) {
        this.millAmount = this.determineAmount(amount)
      },
      scryAmount(amount) {
        this.scryAmount = this.determineAmount(amount)
      },
      'user.life'(amount) {
        if (amount <= 0 && !this.isGameOver) {
          this.endGame()
        }
      },
      'user.library_total'(amount) {
        if (amount <= 0 && !this.isGameOver) {
          this.endGame()
        }
      },
      game() {
        if (this.user.is_active_turn || this.opponent.is_active_turn) {
          this.drawAmount = 1
        }
      },
    },
    methods: {
      getEventText(event) {
        const text = (() => ({
          'counter-card': (event) => `Placed ${event.data.amount} ${this.functions.toUpperCaseWords(event.data.counter)} Counters on ${event.card_name}`,
          'counter-user': (event) => `Received ${event.data.amount} ${this.functions.toUpperCaseWords(event.data.counter)} Counters`,
          'draw': (event) => `Drew a Card`,
          'end-game': (event) => `Lost the Game, ${event.winner} is the Winner`,
          'end-turn': (event) => `Ended Their Turn`,
          'life': (event) => `Changed Their Life to ${event.data.life}`,
          'mill': (event) => `Milled a Card`,
          'move': (event) => {
            let message = `Moved ${event.card_name} to the ${this.functions.toUpperCaseWords(event.data.zone)}`
            if (event.data.zone === 'remove') {
              message = `Removed ${event.card_name} from the Game`
            }
            return message
          },
          'mulligan': (event) => `Performed a Mulligan`,
          'power': (event) => `Changed the Power of ${event.card_name} to ${event.data.power}`,
          'scry': (event) => `Scried for ${event.data.amount}`,
          'shuffle': (event) => `Shuffled Their Deck`,
          'tap': (event) => `Tapped ${event.card_name}`,
          'token': (event) => `Created a ${event.card_name} Token`,
          'toughness': (event) => `Changed the Toughness of ${event.card_name} to ${event.data.toughness}`,
          'transform': () => `Transformed a Card`,
        }))()[event.name]
        return `${event.handle} ${text(event)}`
      },
      closeModal(modal) {
        this[modal].hide()
      },
      determineAmount(amount) {
        return amount > this.user.library_total
          ? this.user.library_total
          : amount <= 0 && this.functions.isNotEmpty(amount)
            ? 1
            : this.functions.isEmpty(amount) ? null : amount
      },
      start() {
        this.fetch.put('/start', {game_id: this.id})
        this.drawAmount = 1
      },
      endTurn() {
        this.fetch.put('/end-turn', {game_id: this.id})
      },
      endGame() {
        this.fetch.put('/end-game', {game_id: this.id})
        this.gameOverModal.show()
        window.setTimeout(() => this.gameOverModal.hide(), 5 * 1000)
      },
      counterOnCard(object_id, name, amount) {
        this.fetch.put('/counter', {game_id: this.id, object_id, name, kind: 'card', amount})
      },
      counterOnUser(name, amount) {
        this.fetch.put('/counter', {game_id: this.id, name, kind: 'user', amount})
      },
      draw() {
        this.fetch.put('/draw', {game_id: this.id, amount: this.drawAmount})
      },
      expand(object) {
        this.object = this.functions.copy(object, {is_tapped: false})
        this.cardModal.show()
      },
      life(amount) {
        this.fetch.put('/life', {game_id: this.id, amount})
      },
      mill() {
        this.fetch.put('/mill', {game_id: this.id, amount: this.millAmount})
      },
      move(object_id, zone, location = 'top') {
        this.fetch.put('/move', {game_id: this.id, object_id, zone, location})
      },
      mulligan() {
        this.fetch.put('/mulligan', {game_id: this.id})
      },
      power(object_id, value) {
        this.fetch.put('/power', {game_id: this.id, object_id, value})
      },
      scry() {
        this.fetch.get('/scry', [this.id, this.scryAmount], ({data}) => {
          this.scryObjects = data
          this.scryModal.show()
        }, false)
      },
      scryBottom(object_id) {
        this.scryObjects = this.scryObjects.filter((object) => object.id !== object_id)
        this.move(object_id, 'library', 'bottom')
        if (this.functions.isEmpty(this.scryObjects)) {
          this.scryModal.hide()
          this.scryAmount = null
        }
      },
      scryTop(object_id) {
        this.scryObjects = this.scryObjects.filter((object) => object.id !== object_id)
        this.move(object_id, 'library', 'top')
        if (this.functions.isEmpty(this.scryObjects)) {
          this.scryModal.hide()
          this.scryAmount = null
        }
      },
      shuffle() {
        this.fetch.put('/shuffle', {game_id: this.id})
      },
      tap(object_id, state) {
        this.fetch.put('/tap', {game_id: this.id, object_id, state})
      },
      tokenCreate(card_id, amount) {
        this.fetch.put('/token', {game_id: this.id, card_id, amount})
        this.tokenObjects = []
        this.token = null
        this.tokenModal.hide()
      },
      tokenSearch() {
        this.fetch.get('/token', [this.token], ({data}) => {
          if (this.functions.isEmpty(data)) {
            this.store.setErrorMessage('No Tokens Found')
            return false
          }
          this.tokenObjects = data
          this.tokenModal.show()
        }, false)
      },
      toughness(object_id, value) {
        this.fetch.put('/toughness', {game_id: this.id, object_id, value})
      },
      transform(object_id, card_face_id) {
        this.fetch.put('/transform', {game_id: this.id, object_id, card_face_id})
      },
    },
  }
</script>