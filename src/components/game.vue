<template>
  <GameInfo
    v-if="functions.isNotEmpty(users)"
    :counters="userCounters"
    :user0="opponent"
    :user1="user"
    @counter="counterOnUser"
    @life="life"
  />

  <div class="row">
    <div
      class="col-8"
      @drop="drop($event, 'field', opponent.user_id)"
      @dragover.prevent
      @dragenter="dragover = 'opponentField'"
      @dragleave.self="dragover = false"
    >
      <Field
        class="border border-warning rounded bg-warning p-1 reverse-columns"
        :class="{
          'bg-opacity-25': dragover === 'opponentField',
          'bg-opacity-10': dragover !== 'opponentField',
        }"
        :actions="factory.actions({drag: false})"
        :objects="opponent.field"
        reversed
        @details="details"
        @expand="expand"
      />
    </div>
    <div class="col-4" v-click-outside="() => stickyObject = factory.object({rulings: []})">
      <Details
        v-if="functions.isNotNull(detailObject.id)"
        :object="detailObject"
        readonly
      />
      <Details
        v-else-if="functions.isNotNull(stickyObject.id)"
        :counters="cardCounters"
        :object="stickyObject"
        @counter="counterOnCard"
        @power="power"
        @reveal="reveal"
        @toughness="toughness"
        @transform="transform"
      />
      <div v-else class="row">
        <div v-if="!user.is_ready" class="col justify-content-center hstack gap-2">
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
        <div v-else class="col">
          <div class="row mb-2">
            <div v-for="zone in stackZones" class="col-3">
              <div
                class="border rounded p-1"
                :class="[{
                  'bg-opacity-25': dragover === zone,
                  'bg-opacity-10': dragover !== zone,
                }, zone === 'library' ? 'border-primary bg-primary' : 'border-danger bg-danger']"
              >
                <p class="text-center small mb-1">{{functions.toUpperCaseWords(zone)}}: {{opponent[`${zone}_total`]}}</p>
                <div class="d-flex justify-content-center">
                  <Card
                    v-if="zone !== 'library' && functions.isNotEmpty(opponent[zone])"
                    class="pointer"
                    :object="[factory.object()].concat(opponent[zone]).pop()"
                    data-bs-toggle="modal"
                    data-bs-target="#zoneSearch"
                    @click="setZoneModalObjects('opponent', zone)"
                  />
                  <Card v-else :object="factory.object()" />
                </div>
              </div>
            </div>
          </div>
          <div :class="{'invisible': isGameOver}">
            <div class="row mb-2">
              <div class="col justify-content-center hstack gap-2">
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
                <button
                  type="button"
                  class="btn btn-warning"
                  @click="shuffle"
                >Shuffle</button>
              </div>
            </div>
            <div class="row mb-2">
              <div class="col justify-content-center hstack gap-2">
                <button
                  type="button"
                  class="btn btn-danger"
                  :class="{'invisible': isGameOver}"
                  @click="endGame"
                  :disabled="isGameOver"
                >Concede</button>
                <Input
                  v-model="token"
                  name="token"
                  type="text"
                  :class="{'invisible': isGameOver}"
                  placeholder="Search for Token"
                  :disabled="isGameOver"
                  :has-margin="false"
                  :has-label="false"
                  @keyup-enter="tokenSearch"
                >
                  <template #inputGroupAfter>
                    <button
                      type="button"
                      class="btn btn-info"
                      :disabled="isGameOver"
                      @click="tokenSearch"
                    >
                      <i class="bi bi-search"></i>
                    </button>
                  </template>
                </Input>
                <button
                  type="button"
                  class="btn btn-danger"
                  :class="{'invisible': !user.is_active_turn}"
                  @click="endTurn"
                >End Turn</button>
                <button
                  type="button"
                  class="btn btn-success"
                  :class="{'invisible': !user.is_active_turn}"
                  @click="untap"
                >Untap</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <hr />

  <div class="row mb-2">
    <div
      class="col-8"
      @drop="drop($event, 'field')"
      @dragover.prevent
      @dragenter="dragover = 'field'"
      @dragleave.self="dragover = false"
    >
      <Field
        class="border border-success rounded bg-success p-1"
        :class="{
          'bg-opacity-25': dragover === 'field',
          'bg-opacity-10': dragover !== 'field',
        }"
        :actions="factory.actions({tap: true})"
        :objects="user.field"
        @details="details"
        @expand="expand"
        @tap="tap"
        @transform="transform"
      />
    </div>
    <div class="col-4" style="max-height: 31.5vh; overflow: auto;">
      <Events :events="events" />
    </div>
  </div>

  <div class="row">
    <div
      class="col-8"
      @drop="drop($event, 'hand')"
      @dragover.prevent
      @dragenter="dragover = 'hand'"
      @dragleave.self="dragover = false"
    >
      <div
        class="border border-info rounded bg-info p-1"
        :class="{
          'bg-opacity-25': dragover === 'hand',
          'bg-opacity-10': dragover !== 'hand',
        }"
      >
        <p class="text-center small mb-1">Hand: {{user.hand_total}}</p>
        <div class="d-flex justify-content-center gap-2">
          <Card
            v-for="object in user.hand"
            class="pointer"
            :object="object"
            @details="details"
            @expand="expand"
          />
        </div>
      </div>
    </div>
    <div
      v-for="zone in stackZones"
      class="col-1"
      @drop="drop($event, zone)"
      @dragover.prevent
      @dragenter="dragover = zone"
      @dragleave.self="dragover = false"
    >
      <div
        class="border rounded p-1"
        :class="[{
          'bg-opacity-25': dragover === zone,
          'bg-opacity-10': dragover !== zone,
        }, zone === 'library' ? 'border-primary bg-primary' : 'border-danger bg-danger']"
      >
        <p class="text-center small mb-1">{{functions.toUpperCaseWords(zone)}}: {{user[`${zone}_total`]}}</p>
        <div class="d-flex justify-content-center">
          <Card
            v-if="functions.isNotEmpty(user[zone])"
            class="pointer"
            :object="zone === 'library' ? factory.object() : [factory.object()].concat(user[zone]).pop()"
            data-bs-toggle="modal"
            data-bs-target="#zoneSearch"
            @click="setZoneModalObjects('user', zone)"
          />
          <Card v-else :object="factory.object()" />
        </div>
      </div>
    </div>
  </div>

  <div id="card" ref="cardModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-transparent">
        <div class="modal-body">
          <div class="row justify-content-center">
            <Card
              :object="modalObject"
              :actions="factory.actions({drag: false, expand: false})"
              class="col"
              height="unset"
              data-bs-dismiss="modal"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="zoneSearch" ref="zoneModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-fullscreen modal-dialog-centered">
      <div class="modal-content bg-transparent">
        <div class="modal-header bg-dark" @click="closeModal('zoneModal')">
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row justify-content-center">
            <Card
              v-for="object in zoneObjects"
              :key="object.id"
              :actions="factory.actions(
                functions.copy(
                  {
                    drag: false,
                    expand: false,
                  },
                  authUser.id === object.user_id ? {move: functions.removeByValue(zones, object.zone)} : {},
                  authUser.id === object.user_id && object.zone === 'exile' ? {counters: cardCounters} : {},
                )
              )"
              :object="object"
              class="col-3 mb-2"
              height="unset"
              @counter="counterOnCard"
              @move="move"
              @transfer="transfer"
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
              :actions="factory.actions({drag: false, expand: false})"
              class="col-3 mb-2"
              height="unset"
            >
              <div class="d-flex justify-content-center hstack gap-2">
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
              :actions="factory.actions({
                drag: false,
                expand: false,
                create: true,
              })"
              :object="object"
              class="col-3 mb-2"
              height="unset"
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
</template>

<script>
  import {computed} from 'vue'

  import Card from './card.vue'
  import Details from './details.vue'
  import Events from './events.vue'
  import Field from './field.vue'
  import GameInfo from './game-info.vue'
  import Input from './input.vue'

  export default {
    components: {
      Card,
      Details,
      Events,
      Field,
      GameInfo,
      Input,
    },
    props: {
      id: {
        type: String,
        required: true,
      },
    },
    data: () => ({
      dragover: false,
      cardModal: null,
      scryModal: null,
      gameOverModal: null,
      tokenModal: null,
      zoneModal: null,
      detailObject: {},
      stickyObject: {},
      modalObject: {},
      drawAmount: 7,
      millAmount: null,
      scryAmount: null,
      scryObjects: [],
      token: null,
      tokenObjects: [],
      zoneObjects: [],
      counters: [],
      zones: [],
      stackZones: [
        'library',
        'graveyard',
        'exile',
        'remove',
      ],
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
        return this.store.game[this.id]
      },
      revealedObject() {
        return this.store.object[this.id]
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
      rulings() {
        return this.game ? this.game.rulings: []
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
      this.fetch.get('/zones', {}, ({data}) => this.zones = data.map(({name}) => name))
      this.fetch.get('/game', [this.id])
      this.fetch.get('/events', [this.id])
      this.detailObject = this.factory.object({rulings: []})
      this.stickyObject = this.factory.object({rulings: []})
      this.modalObject = this.factory.object()
    },
    mounted() {
      this.zoneModal = new bootstrap.Modal(this.$refs.zoneModal)
      this.cardModal = new bootstrap.Modal(this.$refs.cardModal)
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
        if (this.functions.isNotEmpty(this.zoneObjects)) {
          const [{user_id, zone}] = this.zoneObjects
          this.zoneObjects = this.objects.filter((object) => object.user_id === user_id && object.zone === zone)
        }
        if (this.functions.isNotNull(this.modalObject.id)) {
          this.modalObject = this.functions.copy(
            this.objects.find((object) => object.id === this.modalObject.id),
            {is_tapped: false}
          )
        }
        if (this.functions.isNotNull(this.stickyObject.id)) {
          this.stickyObject = this.functions.copy(
            this.objects.find((object) => object.id === this.stickyObject.id),
            {is_tapped: false}
          )
        }
      },
      revealedObject(x) {
        this.modalObject = x
        this.cardModal.show()
      },
    },
    methods: {
      closeModal(modal) {
        this[modal].hide()
        this.zoneObjects = []
        this.modalObject = this.factory.object()
      },
      setZoneModalObjects(kind, zone) {
        this.zoneObjects = this[kind][zone]
      },
      openModal(modal) {
        this[modal].show()
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
        setTimeout(() => this.gameOverModal.hide(), 5 * 1000)
      },
      counterOnCard(object_id, name, amount) {
        this.fetch.put('/counter', {game_id: this.id, object_id, name, kind: 'card', amount})
      },
      counterOnUser(name, amount) {
        this.fetch.put('/counter', {game_id: this.id, name, kind: 'user', amount})
      },
      details(object, sticky) {
        object = this.functions.copy(object, {
          rulings: this.rulings.filter(({oracle_id}) => oracle_id === object.card.oracle_id)
        })
        this.detailObject = object
        if (sticky) {
          this.stickyObject = object
        }
      },
      draw() {
        this.fetch.put('/draw', {game_id: this.id, amount: this.drawAmount})
      },
      drop(event, zone, opponent_id = null) {
        this.dragover = false
        const object = JSON.parse(event.dataTransfer.getData('application/json'))
        if (this.functions.isNotNull(opponent_id)) {
          this.transfer(object.id, zone)
        }
        if (object.zone !== zone && this.functions.isNull(opponent_id)) {
          this.move(object.id, zone)
        }
      },
      expand(object) {
        this.modalObject = this.functions.copy(object, {is_tapped: false})
        this.cardModal.show()
      },
      life(amount) {
        this.fetch.put('/life', {game_id: this.id, amount})
      },
      mill() {
        this.fetch.put('/mill', {game_id: this.id, amount: this.millAmount})
      },
      move(object_id, zone, location = 'top') {
        this.fetch.put('/move', {game_id: this.id, object_id: object_id, zone, location})
      },
      mulligan() {
        this.fetch.put('/mulligan', {game_id: this.id})
      },
      power(object_id, value) {
        this.fetch.put('/power', {game_id: this.id, object_id, value})
      },
      reveal(object_id) {
        this.fetch.get('/reveal', [this.id, object_id], undefined, false)
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
      transfer(object_id, zone) {
        this.fetch.put('/transfer', {game_id: this.id, object_id, zone})
      },
      transform(object_id, card_face_id) {
        this.fetch.put('/transform', {game_id: this.id, object_id, card_face_id})
      },
      untap() {
        this.fetch.put('/untap', {game_id: this.id})
      },
    },
  }
</script>