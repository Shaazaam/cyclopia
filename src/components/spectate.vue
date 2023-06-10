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

    <!-- <div class="row mb-3">
      <div class="col justify-content-center hstack gap-3">
        <button
          type="button"
          class="btn btn-primary"
          data-bs-toggle="offcanvas"
          data-bs-target="#eventLog"
        >Log</button>
      </div>
    </div> -->
  </div>

  <div class="row mb-3">
    <div class="col-8" :class="{'invisible': functions.isEmpty(user0.hand)}">
      <div
        id="hand"
        class="border border-info-subtle rounded bg-info bg-opacity-10 collapse show"
      >
        <div class="d-flex justify-content-center gap-3">
          <Card
            v-for="object in user0.hand"
            :object="object"
            :actions="factory.actions({drag: false})"
            :contain-height="user0.hand.length <= 5"
            @expand="expand"
          />
        </div>
      </div>
      <div class="d-grid">
        <button class="btn btn-sm btn-outline-info" data-bs-toggle="collapse" data-bs-target="#hand">Hand</button>
      </div>
    </div>
    <div v-for="zone in stackZones" class="col-1">
      <div
        :id="zone"
        class="border bg-opacity-10 rounded collapse show"
        :class="[zone === 'library' ? 'border-primary-subtle bg-primary' : 'border-danger-subtle bg-danger']"
      >
        <div class="d-flex justify-content-center gap-3">
          <Card
            :object="zone === 'library' ? factory.object() : [factory.object()].concat(user0[zone]).pop()"
            :actions="factory.actions({drag: false})"
          >
            <h5 class="mb-0">Cards: {{user0[`${zone}_total`]}}</h5>
          </Card>
        </div>
      </div>
      <div class="d-grid">
        <button
          class="btn btn-sm"
          :class="zone === 'library' ? 'btn-outline-primary' : 'btn-outline-danger'"
          data-bs-toggle="collapse"
          :data-bs-target="`#${zone}`"
        >{{functions.toUpperCaseWords(zone)}}</button>
      </div>
    </div>
  </div>

  <Field
    :objects="user0.field"
    :actions="factory.actions({stats: true, drag: false})"
    reversed
    @expand="expand"
  />

  <hr />

  <Field
    :objects="user1.field"
    :actions="factory.actions({stats: true, drag: false})"
    @expand="expand"
  />

  <!-- <div class="sticky-bottom mt-3"> -->
    <div class="row mt-3">
      <div class="col-8" :class="{'invisible': functions.isEmpty(user1.hand)}">
        <div class="d-grid">
          <button class="btn btn-sm btn-outline-info" data-bs-toggle="collapse" data-bs-target="#hand">Hand</button>
        </div>
        <div
          id="hand"
          class="border border-info-subtle rounded bg-info bg-opacity-10 collapse show"
        >
          <div class="d-flex justify-content-center gap-3">
            <Card
              v-for="object in user1.hand"
              :object="object"
              :actions="factory.actions({drag: false})"
              :contain-height="user1.hand.length <= 5"
              @expand="expand"
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
          class="border bg-opacity-10 rounded collapse show"
          :class="[zone === 'library' ? 'border-primary-subtle bg-primary' : 'border-danger-subtle bg-danger']"
        >
          <div class="d-flex justify-content-center gap-3">
            <Card
              :object="zone === 'library' ? factory.object() : [factory.object()].concat(user1[zone]).pop()"
              :actions="factory.actions({drag: false})"
            >
              <h5 class="mb-0">Cards: {{user1[`${zone}_total`]}}</h5>
            </Card>
          </div>
        </div>
      </div>
    </div>
  <!-- </div> -->

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
      object: {},
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
    created() {
      this.fetch.get('/counters', {}, ({data}) => this.counters = data)
      this.fetch.get('/zones', {}, ({data}) => {
        this.zones = data.map(({name}) => name)
        //this.cardZones = this.zones.reduce((agg, name) => agg = this.functions.copy(agg, {[name]: []}), {})
      })
      this.fetch.post('/spectators', {id: this.id})
      this.fetch.get('/events', [this.id])
      this.object = this.factory.object()
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
      expand(object) {
        this.object = this.functions.copy(object, {is_tapped: false})
        this.cardModal.show()
      },
    },
  }
</script>