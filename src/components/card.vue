<template>
  <div
    class="card text-light bg-transparent"
    :draggable="_actions.drag && functions.isNotNull(object.id) && !isGameOver"
    @mouseenter="details(true)"
    @mouseleave="details(false)"
    @click.left="clickLeft"
    @click.right="clickRight"
    @contextmenu.prevent
    @dragstart="drag"
  >
    <img
      :src="image"
      class="card-img"
      :class="{'tapped': object.is_tapped}"
      :style="{'height': height}"
    />
    <div
      class="card-img-overlay"
    >
      <div class="d-flex justify-content-center gap-2">
        <div v-if="functions.isNotEmpty(_actions.move) && !isGameOver" class="dropdown-center align-self-start">
          <button
            type="button"
            class="btn btn-primary dropdown-toggle"
            data-bs-toggle="dropdown"
          >Move</button>
          <ul class="dropdown-menu bg-transparent">
            <li v-for="zone in _actions.move" class="py-1">
              <button type="button" class="btn btn-primary" @click="move(zone)">{{functions.toUpperCaseWords(zone)}}</button>
            </li>
            <li class="py-1">
              <button type="button" class="btn btn-warning" @click="transfer">To Opponent</button>
            </li>
          </ul>
        </div>
        <div v-if="_actions.create" class="input-group">
          <button
            type="button"
            class="btn btn-success"
            @click="create"
          >Create</button>
          <input
            type="number"
            v-model="createAmount"
            class="form-control"
            min="1"
          />
        </div>
        <div v-if="functions.isNotEmpty(_actions.counters) && !isGameOver">
          <div v-for="{name, amount} in object.counters">
            <div v-if="amount > 0" class="input-group mb-2">
              <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
              <input
                type="text"
                class="form-control bg-dark text-light"
                :value="amount"
                disabled
              />
            </div>
          </div>
          <div class="dropdown">
            <button type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown">Counters</button>
            <ul class="dropdown-menu bg-transparent">
              <li class="py-1">
                <div class="input-group">
                  <select v-model="selectedCounter" class="form-control">
                    <option value="" disabled></option>
                    <option v-for="{name} in _actions.counters" :value="name">{{functions.toUpperCaseWords(name)}}</option>
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
      <slot></slot>
    </div>
  </div>
</template>

<script>
  export default {
    props: {
      actions: {
        type: Object,
        default: null,
      },
      object: {
        type: Object,
        required: true,
      },
      height: {
        type: String,
        default: '15vh',
      },
    },
    inject: {
      isGameOver: {
        from: 'isGameOver'
      },
    },
    emits: [
      'create',
      'counter',
      'details',
      'drag',
      'expand',
      'move',
      'tap',
      'transfer',
    ],
    data: () => ({
      _actions: null,
      createAmount: 1,
      selectedCounter: null,
      hover: false,
      timeout: null,
    }),
    computed: {
      image() {
        let image = '/images/card-back.jpg'
        if (this.functions.isNotNull(this.object.card.image_uris)) {
          image = this.object.card.image_uris.normal
        }
        if (this.functions.isNotNull(this.object.active_face)) {
          image = this.object.active_face.image_uris.normal
        }
        return image
      },
      selectedCounterAmount() {
        return this.functions.isNotNull(this.selectedCounter) ? this.object.counters.find(({name}) => name === this.selectedCounter).amount : 0
      },
    },
    created() {
      this._actions = this.functions.isNull(this.actions) ? this.factory.actions() : this.actions
    },
    methods: {
      drag(event) {
        event.dataTransfer.dropEffect = 'move'
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('application/json', JSON.stringify(this.object))
      },
      clickLeft() {
        if (this.functions.isNull(this.timeout) && this._actions.tap && !this.isGameOver) {
          this.timeout = setTimeout(() => {
            this.tap(!this.object.is_tapped)
            this.timeout = null
          }, 200)
        } else {
          clearTimeout(this.timeout)
          this.timeout = null
          if (this._actions.expand) {
            this.expand()
          }
        }
      },
      clickRight() {
        this.details(true, true)
      },
      create() {
        this.$emit('create', this.object.card.id, this.createAmount)
      },
      counter(amount) {
        this.$emit('counter', this.object.id, this.selectedCounter, amount)
      },
      details(state, sticky) {
        this.$emit('details', state ? this.functions.copy(this.object, {is_tapped: false}) : this.factory.object(), sticky)
      },
      expand() {
        this.$emit('expand', this.object)
      },
      move(zone) {
        this.$emit('move', this.object, zone)
      },
      tap(state) {
        this.$emit('tap', this.object.id, state)
      },
      transfer() {
        this.$emit('transfer', this.object.id, 'field')
      },
    },
  }
</script>