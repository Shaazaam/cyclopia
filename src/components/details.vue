<template>
  <div class="row details">
    <div class="col-5">
      <Card :object="object" height="31.5vh" />
    </div>
    <div class="col-7">
      <div class="row">
        <div class="col-6">
          <div class="input-group mb-2">
            <input
              v-if="isMine && !isGameOver && !readonly && !inHand"
              v-model="power"
              type="number"
              class="form-control"
            />
            <input
              v-else
              type="text"
              :value="power"
              class="form-control bg-dark text-light"
              disabled
            />
            <span class="input-group-text bg-dark text-light">/</span>
            <input
              v-if="isMine && !isGameOver && !readonly && !inHand"
              v-model="toughness"
              type="number"
              class="form-control"
            />
            <input
              v-else
              type="text"
              :value="toughness"
              class="form-control bg-dark text-light"
              disabled
            />
          </div>
          <div class="d-grid gap-2">
            <button
              v-if="functions.isNotEmpty(object.rulings)"
              type="button"
              class="btn btn-info"
              data-bs-toggle="modal"
              data-bs-target="#cardRules"
            >Rules</button>
            <button
              v-if="inHand"
              type="button"
              class="btn btn-warning"
              @click="reveal"
            >Reveal</button>
            <button
              v-if="isMine && functions.isNotNull(object.active_face) && !isGameOver"
              type="button"
              class="btn btn-info"
              @click="transform"
            >Transform</button>
          </div>
        </div>
        <div class="col-6">
          <template v-for="{name, amount} in object.counters">
            <div v-if="amount > 0" class="input-group mb-2">
              <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
              <input
                type="text"
                class="form-control bg-dark text-light"
                :value="amount"
                disabled
              />
            </div>
          </template>
          <div v-if="isMine && !isGameOver" class="d-grid dropdown">
            <button type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown">Counters</button>
            <ul class="dropdown-menu bg-transparent">
              <li class="py-1">
                <div class="input-group">
                  <select v-model="selectedCounter" class="form-control" placeholder="Select...">
                    <option value="" disabled>Select...</option>
                    <option v-for="{name} in counters" :value="name">{{functions.toUpperCaseWords(name)}}</option>
                  </select>
                  <input
                    v-model="selectedCounterAmount"
                    type="number"
                    class="form-control"
                    min="0"
                  />
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="cardRules" ref="cardRulesModal" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-dark">
        <div class="modal-body">
          <p v-for="ruling in object.rulings">
            <span class="text-warning">{{functions.localeDate(ruling.published_at)}}</span>: {{ruling.comment}}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import Card from './card.vue'
  import Input from './input.vue'

  export default {
    components: {
      Card,
      Input,
    },
    props: {
      counters: {
        type: Array,
      },
      object: {
        type: Object,
        required: true,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
    },
    inject: {
      isGameOver: {
        from: 'isGameOver'
      },
    },
    emits: [
      'counter',
      'reveal',
      'power',
      'toughness',
      'transform',
    ],
    data: () => ({
      selectedCounter: null,
      cardRulesModal: null,
    }),
    computed: {
      power: {
        get() {
          return this.functions.isNotNull(this.object.power) ? this.sumPTCounters(this.object.power) : null
        },
        set(x) {
          if (this.functions.isNotEmpty(x)) {
            this.$emit('power', this.object.id, x)
          }
        },
      },
      toughness: {
        get() {
          return this.functions.isNotNull(this.object.toughness) ? this.sumPTCounters(this.object.toughness) : null
        },
        set(x) {
          if (this.functions.isNotEmpty(x)) {
            this.$emit('toughness', this.object.id, x)
          }
        },
      },
      selectedCounterAmount: {
        get() {
          return this.functions.isNotNull(this.selectedCounter) ? this.object.counters.find(({name}) => name === this.selectedCounter).amount : 0
        },
        set(x) {
          if (this.functions.isNotEmpty(x)) {
            this.$emit('counter', this.object.id, this.selectedCounter, x)
          }
        },
      },
      inHand() {
        return this.object.zone === 'hand'
      },
      isMine() {
        return this.object.user_id === this.authUser.id
      },
    },
    mounted() {
      this.cardRulesModal = new bootstrap.Modal(this.$refs.cardRulesModal)
    },
    methods: {
      reveal() {
        this.$emit('reveal', this.object.id)
      },
      sumPTCounters(value) {
        return this.functions.toNumber(value)
          + this.object.counters.reduce((agg, {name, amount}) => name === '+1/+1' ? agg + amount : agg, 0)
          - this.object.counters.reduce((agg, {name, amount}) => name === '-1/-1' ? agg + amount : agg, 0)
      },
      transform() {
        this.$emit('transform', this.object.id, this.object.card_faces.find((face) => face.id !== this.object.active_face.id).id)
      },
    },
  }
</script>