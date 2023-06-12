<template>
  <div class="sticky-top mb-3">
    <div v-if="functions.isNotEmpty(users)" class="row">
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
  </div>

  <div class="row">
    <div class="col-9 border border-warning rounded bg-warning bg-opacity-10 reverse-columns">
      <Field
        :objects="opponent.field"
        :actions="factory.actions({drag: false})"
        @details="details"
        @expand="expand"
      />
    </div>
    <div class="col-3" v-click-outside="() => stickyObject = factory.object()">
      <div v-if="functions.isNotNull(detailObject.id)" class="card-group">
        <Card :object="detailObject" height="30vh" />
        <div class="card text-light bg-transparent">
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
              <div class="input-group">
                <input
                  :type="isMine && !isGameOver && detailObject.zone !== 'hand' ? 'number' : 'text'"
                  :value="detailObject.power"
                  class="form-control"
                  :class="!isMine || isGameOver || detailObject.zone === 'hand' ? ['bg-dark', 'text-light'] : []"
                  :disabled="!isMine || isGameOver || detailObject.zone === 'hand'"
                  @change="(e) => power(detailObject.id, e.target.value)"
                />
                <span class="input-group-text bg-dark text-light">/</span>
                <input
                  :type="isMine && !isGameOver && detailObject.zone !== 'hand' ? 'number' : 'text'"
                  :value="detailObject.toughness"
                  class="form-control"
                  :class="!isMine || isGameOver || detailObject.zone === 'hand' ? ['bg-dark', 'text-light'] : []"
                  :disabled="!isMine || isGameOver || detailObject.zone === 'hand'"
                  @change="(e) => toughness(detailObject.id, e.target.value)"
                />
              </div>
            </div>
            <template v-for="{name, amount} in detailObject.counters">
              <div v-if="amount > 0" class="d-flex justify-content-between mb-2">
                <div class="input-group">
                  <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
                  <input
                    type="text"
                    class="form-control bg-dark text-light"
                    :value="amount"
                    disabled
                  />
                </div>
              </div>
            </template>
            <div v-if="!isGameOver" class="d-flex justify-content-between">
              <div class="dropdown-center" style="width: 100%;">
                <button type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown">Counters</button>
                <ul class="dropdown-menu bg-transparent">
                  <li class="py-1">
                    <div class="input-group">
                      <select v-model="selectedCounter" class="form-control">
                        <option value="" disabled></option>
                        <option v-for="{name} in cardCounters" :value="name">{{functions.toUpperCaseWords(name)}}</option>
                      </select>
                      <input
                        type="number"
                        class="form-control"
                        :value="selectedCounterAmount"
                        min="0"
                        @change="(e) => counterOnCard(detailObject.id, selectedCounter, e.target.value)"
                      />
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="functions.isNotNull(stickyObject.id)" class="card-group">
        <Card :object="stickyObject" height="30vh" />
        <div class="card text-light bg-transparent">
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
              <div class="input-group">
                <input
                  :type="isMine && !isGameOver && stickyObject.zone !== 'hand' ? 'number' : 'text'"
                  :value="stickyObject.power"
                  class="form-control"
                  :class="!isMine || isGameOver || stickyObject.zone === 'hand' ? ['bg-dark', 'text-light'] : []"
                  :disabled="!isMine || isGameOver || stickyObject.zone === 'hand'"
                  @change="(e) => power(stickyObject.id, e.target.value)"
                />
                <span class="input-group-text bg-dark text-light">/</span>
                <input
                  :type="isMine && !isGameOver && stickyObject.zone !== 'hand' ? 'number' : 'text'"
                  :value="stickyObject.toughness"
                  class="form-control"
                  :class="!isMine || isGameOver || stickyObject.zone === 'hand' ? ['bg-dark', 'text-light'] : []"
                  :disabled="!isMine || isGameOver || stickyObject.zone === 'hand'"
                  @change="(e) => toughness(stickyObject.id, e.target.value)"
                />
              </div>
            </div>
            <template v-for="{name, amount} in stickyObject.counters">
              <div v-if="amount > 0" class="d-flex justify-content-between mb-2">
                <div class="input-group">
                  <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
                  <input
                    type="text"
                    class="form-control bg-dark text-light"
                    :value="amount"
                    disabled
                  />
                </div>
              </div>
            </template>
            <div v-if="!isGameOver" class="d-flex justify-content-between">
              <div class="dropdown-center" style="width: 100%;">
                <button type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown">Counters</button>
                <ul class="dropdown-menu bg-transparent">
                  <li class="py-1">
                    <div class="input-group">
                      <select v-model="selectedCounter" class="form-control">
                        <option value="" disabled></option>
                        <option v-for="{name} in cardCounters" :value="name">{{functions.toUpperCaseWords(name)}}</option>
                      </select>
                      <input
                        type="number"
                        class="form-control"
                        :value="selectedCounterAmount"
                        min="0"
                        @change="(e) => counterOnCard(stickyObject.id, selectedCounter, e.target.value)"
                      />
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="row" :class="{'invisible': isGameOver}">
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
        <div v-else :class="{'invisible': isGameOver}">
          <div class="row mb-3">
            <div class="col justify-content-center hstack gap-3">
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
            </div>
          </div>
          <div class="row mb-3">
            <div class="col justify-content-center hstack gap-3">
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
            </div>
          </div>
          <div class="row">
            <div class="col justify-content-center hstack gap-3">
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
                class="btn btn-danger"
                :class="{'invisible': isGameOver}"
                @click="endGame"
                :disabled="isGameOver"
              >Concede</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <hr />

  <div class="row">
    <div
      class="col-9 border border-success rounded bg-success"
      :class="{
        'bg-opacity-25': dragover,
        'bg-opacity-10': !dragover,
      }"
      @drop="drop($event, 'field')"
      @dragover.prevent
      @dragenter="dragover = true"
      @dragleave="dragover = false"
    >
      <Field
        :objects="user.field"
        :actions="factory.actions({tap: true})"
        @details="details"
        @expand="expand"
        @tap="tap"
        @transform="transform"
      />
    </div>
    <div class="col-3" style="max-height:30vh; overflow: auto;">
      <p class="small mb-2" v-for="event in events">
        <span class="text-warning">{{functions.localeDateTime(event.created_on)}}</span>: {{getEventText(event)}}
      </p>
    </div>
  </div>

  <div class="sticky-bottom mt-3">
    <div class="row">
      <div class="col-8" :class="{'invisible': functions.isEmpty(user.hand)}">
        <div class="d-grid">
          <button class="btn btn-sm btn-outline-info" data-bs-toggle="collapse" data-bs-target="#hand">Hand</button>
        </div>
        <div
          id="hand"
          class="border border-info-subtle rounded bg-info collapse show"
          :class="{
            'bg-opacity-25': dragover,
            'bg-opacity-10': !dragover,
          }"
          @drop="drop($event, 'hand')"
          @dragover.prevent
          @dragenter="dragover = true"
          @dragleave="dragover = false"
        >
          <div class="d-flex justify-content-center gap-3">
            <Card
              v-for="object in user.hand"
              :object="object"
              @details="details"
              @expand="expand"
              @transform="transform"
            />
          </div>
        </div>
      </div>
      <div v-for="zone in stackZones" class="col-1">
        <div class="d-grid">
          <button
            class="btn btn-sm"
            :class="zone === 'library' ? 'btn-outline-primary' : 'btn-outline-danger'"
            data-bs-toggle="collapse"
            :data-bs-target="`#${zone}`"
          >{{functions.toUpperCaseWords(zone)}}</button>
        </div>
        <div
          :id="zone"
          class="border rounded collapse show"
          :class="[{
            'bg-opacity-25': dragover,
            'bg-opacity-10': !dragover,
          }, zone === 'library' ? 'border-primary-subtle bg-primary' : 'border-danger-subtle bg-danger']"
          data-bs-toggle="modal"
          :data-bs-target="`#${zone}Search`"
          @drop="drop($event, zone)"
          @dragover.prevent
          @dragenter="dragover = true"
          @dragleave="dragover = false"
        >
          <div class="d-flex justify-content-center gap-3">
            <Card :object="zone === 'library' ? factory.object() : [factory.object()].concat(user[zone]).pop()">
              <h5 class="mb-0">Cards: {{user[`${zone}_total`]}}</h5>
            </Card>
          </div>
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

  <div
    v-for="zone in stackZones"
    :id="`${zone}Search`"
    :data-ref="`${zone}Modal`"
    ref="modals"
    class="modal fade"
    tabindex="-1"
  >
    <div class="modal-dialog modal-fullscreen modal-dialog-centered">
      <div class="modal-content bg-transparent">
        <div class="modal-header bg-dark" @click="closeModal(`${zone}Modal`)">
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row justify-content-center">
            <Card
              v-for="object in user[zone]"
              :object="object"
              :actions="zone === 'exile'
                ? factory.actions({
                    counters: cardCounters,
                    drag: false,
                    expand: false,
                    move: functions.removeByValue(zones, zone),
                  })
                : factory.actions({
                    drag: false,
                    expand: false,
                    move: functions.removeByValue(zones, zone),
                  })
              "
              class="col-3 mb-3"
              height="unset"
              @counter="counterOnCard"
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
              :actions="factory.actions({drag: false, expand: false})"
              class="col-3 mb-3"
              height="unset"
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
                drag: false,
                expand: false,
                create: true,
              })"
              class="col-3 mb-3"
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
      dragover: false,
      cardModal: null,
      graveyardModal: null,
      libraryModal: null,
      scryModal: null,
      gameOverModal: null,
      tokenModal: null,
      detailObject: {},
      stickyObject: {},
      modalObject: {},
      selectedCounter: null,
      drawAmount: 7,
      millAmount: null,
      scryAmount: null,
      scryObjects: [],
      token: null,
      tokenObjects: [],
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
      isMine() {
        return this.detailObject.user_id === this.authUser.id || this.stickyObject.user_id === this.authUser.id
      },
      selectedCounterAmount() {
        return this.functions.isNotNull(this.selectedCounter) ? this.stickyObject.counters.find(({name}) => name === this.selectedCounter).amount : 0
      },
    },
    created() {
      this.fetch.get('/counters', {}, ({data}) => this.counters = data)
      this.fetch.get('/zones', {}, ({data}) => this.zones = data.map(({name}) => name))
      this.fetch.get('/game', [this.id])
      this.fetch.get('/events', [this.id])
      this.detailObject = this.factory.object()
      this.stickyObject = this.factory.object()
      this.modalObject = this.factory.object()
    },
    mounted() {
      this.$refs.modals.forEach((modal) => this[modal.dataset.ref] = new bootstrap.Modal(modal))
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
        if (this.functions.isNotNull(this.stickyObject.id)) {
          this.stickyObject = this.objects.find((object) => object.id === this.stickyObject.id)
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
          'tap': (event) => `${event.data.is_tapped ? 'Tapped' : 'Untapped'} ${event.card_name}`,
          'token': (event) => `Created a ${event.card_name} Token`,
          'toughness': (event) => `Changed the Toughness of ${event.card_name} to ${event.data.toughness}`,
          'transform': () => `Transformed a Card`,
          'untap': () => `Untapped Their Cards`,
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
        setTimeout(() => this.gameOverModal.hide(), 5 * 1000)
      },
      counterOnCard(object_id, name, amount) {
        this.fetch.put('/counter', {game_id: this.id, object_id, name, kind: 'card', amount})
      },
      counterOnUser(name, amount) {
        this.fetch.put('/counter', {game_id: this.id, name, kind: 'user', amount})
      },
      details(object, sticky) {
        this.detailObject = object
        if (sticky) {
          this.stickyObject = object
        }
      },
      draw() {
        this.fetch.put('/draw', {game_id: this.id, amount: this.drawAmount})
      },
      drop(event, zone) {
        if (!this.isGameOver) {
          this.move(JSON.parse(event.dataTransfer.getData('application/json')), zone)
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
      move(object, zone, location = 'top') {
        this.fetch.put('/move', {
          game_id: this.id,
          object_id: object.id,
          zone: !['field', 'remove'].includes(zone) && object.card.type_line.includes('Token') ? 'remove' : zone,
          location,
        })
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
      untap() {
        this.fetch.put('/untap', {game_id: this.id})
      },
    },
  }
</script>