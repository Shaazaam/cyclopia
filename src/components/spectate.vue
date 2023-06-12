<template>
  <div class="sticky-top mb-3">
    <div v-if="functions.isNotEmpty(users)" class="row mb-3">
      <div
        class="col-4 hstack gap-3"
        :class="{'invisible': !user0.is_ready}"
      >
        <div class="input-group">
          <span class="input-group-text bg-dark text-light">Life</span>
          <input
            type="text"
            class="form-control bg-dark text-light"
            :value="user0.life"
            disabled
          />
        </div>
        <div v-for="{name} in userCounters.toReversed()" class="input-group">
          <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
          <input
            type="text"
            class="form-control bg-dark text-light"
            :value="user0.counters[name]"
            disabled
          />
        </div>
      </div>
      <h4 class="col text-center">
        <i v-if="user0.is_winner" class="bi bi-trophy-fill text-warning"></i>
        <i v-if="user0.is_active_turn && !isGameOver" class="bi bi-caret-right-fill text-danger"></i>
          {{user0.handle}} vs {{user1.handle}}
        <i v-if="user1.is_active_turn && !isGameOver" class="bi bi-caret-left-fill text-success"></i>
        <i v-if="user1.is_winner" class="bi bi-trophy-fill text-warning"></i>
      </h4>
      <div
        class="col-4 hstack gap-3 text-nowrap"
        :class="{'invisible': !user1.is_ready}"
      >
        <div v-for="{name} in userCounters" class="input-group">
          <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
          <input
            type="text"
            class="form-control bg-dark text-light"
            :value="user1.counters[name]"
            disabled
          />
        </div>
        <div class="input-group">
          <span class="input-group-text bg-dark text-light">Life</span>
          <input
            type="text"
            class="form-control bg-dark text-light"
            :value="user1.life"
            disabled
          />
        </div>
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col-9 border border-warning rounded bg-warning bg-opacity-10 reverse-columns">
      <Field
        :objects="user0.field"
        :actions="factory.actions({drag: false})"
        @details="details"
        @expand="expand"
      />
    </div>
    <div class="col-3">
      <div v-if="functions.isNotNull(detailObject.id)" class="card-group">
        <Card :object="detailObject" height="30vh" />
        <div class="card text-light bg-transparent">
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
              <div class="input-group">
                <input
                  type="text"
                  :value="detailObject.power"
                  class="form-control bg-dark text-light"
                  disabled
                />
                <span class="input-group-text bg-dark text-light">/</span>
                <input
                  type="text"
                  :value="detailObject.toughness"
                  class="form-control bg-dark text-light"
                  disabled
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
          </div>
        </div>
      </div>
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="col-9 border border-success rounded bg-success bg-opacity-10">
      <Field
        :objects="user1.field"
        :actions="factory.actions({drag: false})"
        @details="details"
        @expand="expand"
      />
    </div>
    <div class="col-3" style="max-height:30vh; overflow: auto;">
      <p class="small mb-2" v-for="event in events">
        <span class="text-warning">{{functions.localeDateTime(event.created_on)}}</span>: {{getEventText(event)}}
      </p>
    </div>
  </div>

  <div id="card" ref="cardModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-transparent">
        <div class="modal-body">
          <div class="row justify-content-center">
            <Card
              :object="modalObject"
              :actions="factory.actions({expand: false})"
              class="col"
              data-bs-dismiss="modal"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import {computed} from 'vue'

  import Card from './card.vue'
  import Field from './field.vue'

  export default {
    components: {
      Card,
      Field,
    },
    props: {
      id: {
        type: String,
        required: true,
      },
    },
    data: () => ({
      cardModal: null,
      detailObject: {},
      modalObject: {},
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
      user0() {
        return this.functions.deepExtend(
          this.zones.reduce((agg, name) =>
            this.functions.copy(
              agg,
              {
                [name]: agg[name].concat(
                  this.objects
                    .filter((object) => object.user_id === this.users[0].user_id)
                    .filter((object) => object.zone === name)
                    .sort(({position: a}, {position: b}) => this.functions.sortNumber(a, b))
                ),
              }
            ),
            this.cardZones
          ),
          this.users[0],
          this.counts.find((count) => count.user_id === this.users[0].user_id)
        )
      },
      user1() {
        return this.functions.deepExtend(
          this.zones.reduce((agg, name) =>
            agg = this.functions.copy(
              agg,
              {
                [name]: agg[name].concat(
                  this.objects
                    .filter((object) => object.user_id === this.users[1].user_id)
                    .filter((object) => object.zone === name)
                    .sort(({position: a}, {position: b}) => this.functions.sortNumber(a, b))
                ),
              }
            ),
            this.cardZones
          ),
          this.users[1],
          this.counts.find((count) => count.user_id === this.users[1].user_id)
        )
      },
      cardCounters() {
        return this.counters.filter((counter) => counter.kind === 'card')
      },
      userCounters() {
        return this.counters.filter((counter) => counter.kind === 'user')
      },
      isGameOver() {
        return this.user1.is_winner || this.user0.is_winner
      },
      events() {
        return this.store.events
      },
    },
    watch: {
      game() {
        if (this.functions.isNotNull(this.detailObject.id)) {
          this.detailObject = this.objects.find((object) => object.id === this.detailObject.id)
        }
      },
    },
    created() {
      this.fetch.get('/counters', {}, ({data}) => this.counters = data)
      this.fetch.get('/zones', {}, ({data}) => this.zones = data.map(({name}) => name))
      this.fetch.post('/spectators', {id: this.id})
      this.fetch.get('/events', [this.id])
      this.detailObject = this.factory.object()
      this.modalObject = this.factory.object()
    },
    mounted() {
      this.cardModal = new bootstrap.Modal(this.$refs.cardModal)
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
      details(object) {
        this.detailObject = object
      },
      expand(object) {
        this.modalObject = this.functions.copy(object, {is_tapped: false})
        this.cardModal.show()
      },
    },
  }
</script>