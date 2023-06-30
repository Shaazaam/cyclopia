<template>
  <GameInfo
    v-if="functions.isNotEmpty(users)"
    :counters="userCounters"
    :user0="user0"
    :user1="user1"
  />

  <div class="row">
    <div class="col-8">
      <Field
        class="border border-success rounded bg-success bg-opacity-10 p-1 reverse-columns"
        :actions="factory.actions({drag: false})"
        :objects="user0.field"
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
        :object="stickyObject"
        readonly
      />
    </div>
  </div>

  <hr />

  <div class="row">
    <div class="col-8">
      <Field
        class="border border-success rounded bg-success bg-opacity-10 p-1"
        :actions="factory.actions({drag: false})"
        :objects="user1.field"
        @details="details"
        @expand="expand"
      />
    </div>
    <div class="col-4" style="max-height:31.5vh; overflow: auto;">
      <Events :events="events" />
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
</template>

<script>
  import {computed} from 'vue'

  import Card from './card.vue'
  import Details from './details.vue'
  import Events from './events.vue'
  import Field from './field.vue'
  import GameInfo from './game-info.vue'

  export default {
    components: {
      Card,
      Details,
      Events,
      Field,
      GameInfo,
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
      stickyObject: {},
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
      rulings() {
        return this.game ? this.game.rulings: []
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
      this.detailObject = this.factory.object({rulings: []})
      this.stickyObject = this.factory.object({rulings: []})
      this.modalObject = this.factory.object()
    },
    mounted() {
      this.cardModal = new bootstrap.Modal(this.$refs.cardModal)
    },
    methods: {
      closeModal(modal) {
        this[modal].hide()
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
      expand(object) {
        this.modalObject = this.functions.copy(object, {is_tapped: false})
        this.cardModal.show()
      },
    },
  }
</script>