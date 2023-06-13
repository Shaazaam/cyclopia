<template>
  <div class="card-group">
    <Card :object="object" height="31.5vh" />
    <div class="card text-light bg-transparent">
      <div class="card-body">
        <div class="d-flex justify-content-between mb-2">
          <div class="input-group">
            <input
              v-if="isMine && !isGameOver && !readonly"
              type="number"
              :value="object.power"
              class="form-control"
              @change="(e) => power(e.target.value)"
            />
            <input
              v-else
              type="text"
              :value="object.power"
              class="form-control bg-dark text-light"
              disabled
            />
            <span class="input-group-text bg-dark text-light">/</span>
            <input
              v-if="isMine && !isGameOver && !readonly"
              type="number"
              :value="object.toughness"
              class="form-control"
              @change="(e) => toughness(e.target.value)"
            />
            <input
              v-else
              type="text"
              :value="object.toughness"
              class="form-control bg-dark text-light"
              disabled
            />
          </div>
        </div>
        <template v-for="{name, amount} in object.counters">
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
        <div v-if="isMine && !isGameOver" class="d-flex justify-content-between">
          <div class="dropdown-center" style="width: 100%;">
            <button type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown">Counters</button>
            <ul class="dropdown-menu bg-transparent">
              <li class="py-1">
                <div class="input-group">
                  <select v-model="selectedCounter" class="form-control">
                    <option value="" disabled></option>
                    <option v-for="{name} in counters" :value="name">{{functions.toUpperCaseWords(name)}}</option>
                  </select>
                  <input
                    type="number"
                    class="form-control"
                    :value="selectedCounterAmount"
                    min="0"
                    @change="(e) => counter(e.target.value)"
                  />
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import Card from './card.vue'

  export default {
    components: {
      Card,
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
      'power',
      'toughness',
    ],
    data: () => ({
      selectedCounter: null,
    }),
    computed: {
      inHand() {
        return this.object.zone === 'hand'
      },
      isMine() {
        return this.object.user_id === this.authUser.id
      },
      selectedCounterAmount() {
        return this.functions.isNotNull(this.selectedCounter) ? this.object.counters.find(({name}) => name === this.selectedCounter).amount : 0
      },
    },
    methods: {
      counter(amount) {
        this.$emit('counter', this.object.id, this.selectedCounter, amount)
      },
      power(value) {
        this.$emit('power', this.object.id, value)
      },
      toughness(value) {
        this.$emit('toughness', this.object.id, value)
      },
    },
  }
</script>