<template>
  <div
    class="card text-light mb-3"
    :class="'bg-' + bg"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <img
      :src="image"
      class="card-img"
      :class="{'tapped': object.is_tapped}"
    />
    <div
      class="card-img-overlay"
      :class="{'invisible': !hover}"
    >
      <div class="d-flex justify-content-between mb-2">
        <button
          v-if="_actions.tap && !isGameOver"
          type="button"
          class="btn"
          :class="{
            'btn-success': object.is_tapped,
            'btn-warning': !object.is_tapped,
          }"
          @click="tap(!object.is_tapped)"
        >
          <i class="bi bi-reply-fill"></i>
        </button>
        <div v-if="functions.isNotEmpty(_actions.move) && !isGameOver" class="dropdown-center">
          <button
            type="button"
            class="btn btn-primary dropdown-toggle"
            data-bs-toggle="dropdown"
          >
            <i class="bi bi-box-arrow-up"></i>
          </button>
          <ul class="dropdown-menu bg-transparent">
            <li v-for="zone in _actions.move" class="py-1">
              <button type="button" class="btn btn-primary" @click="move(zone)">{{formatters.toUpperCaseWords(zone)}}</button>
            </li>
          </ul>
        </div>
        <button
          v-if="_actions.transform && functions.isNotNull(object.active_face) && !isGameOver"
          type="button"
          class="btn btn-info"
          @click="transform"
        >
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button
          v-if="_actions.expand"
          type="button"
          class="btn btn-light"
          @click="expand"
        >
          <i class="bi bi-zoom-in"></i>
        </button>
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
      </div>
      <div class="d-flex justify-content-between mb-2">
        <div v-if="_actions.stats" class="input-group">
          <input
            :type="isMine && !isGameOver ? 'number' : 'text'"
            :value="object.power"
            class="form-control"
            :class="!isMine || isGameOver ? ['bg-dark', 'text-light'] : []"
            :disabled="!isMine || isGameOver"
            @focusout="(e) => power(e.target.value)"
            @keyup.enter="(e) => power(e.target.value)"
          />
          <span class="input-group-text bg-dark text-light">/</span>
          <input
            :type="isMine && !isGameOver ? 'number' : 'text'"
            :value="object.toughness"
            class="form-control"
            :class="!isMine || isGameOver ? ['bg-dark', 'text-light'] : []"
            :disabled="!isMine || isGameOver"
            @focusout="(e) => toughness(e.target.value)"
            @keyup.enter="(e) => toughness(e.target.value)"
          />
        </div>
      </div>
      <template v-for="{name, amount} in object.counters">
        <div v-if="amount > 0" class="d-flex justify-content-between mb-2">
          <div class="input-group">
            <span class="input-group-text bg-dark text-light">{{formatters.toUpperCaseWords(name)}}</span>
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
        <div v-if="functions.isNotEmpty(_actions.counters)" class="dropdown-center" style="width: 100%;">
          <button type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown">Counters</button>
          <ul class="dropdown-menu bg-transparent">
            <li class="py-1">
              <div class="input-group">
                <select v-model="selectedCounter" class="form-control">
                  <option value="" disabled></option>
                  <option v-for="{name} in _actions.counters" :value="name">{{formatters.toUpperCaseWords(name)}}</option>
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
      bg: {
        type: String,
        default: 'dark',
      },
      object: {
        type: Object,
        required: true,
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
      'expand',
      'move',
      'power',
      'tap',
      'toughness',
      'transform',
    ],
    data: () => ({
      _actions: null,
      createAmount: 1,
      selectedCounter: null,
      hover: false,
    }),
    computed: {
      isMine() {
        return this.object.user_id === this.authUser.id
      },
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
      this._actions = this.functions.isNull(this.actions)
        ? this.factory.actions()
        : this.actions
      if (['exile', 'field', 'graveyard'].includes(this.object.zone) && this.object.card.type_line.includes('Token')) {
        this._actions = this.functions.copy(this._actions, {
          move: this.functions.removeByValue(this._actions.move, 'graveyard')
        })
      }
    },
    methods: {
      create() {
        this.$emit('create', this.object.card.id, this.createAmount)
      },
      counter(amount) {
        this.$emit('counter', this.object.id, this.selectedCounter, amount)
      },
      expand() {
        this.$emit('expand', this.object)
      },
      move(zone) {
        this.$emit('move', this.object.id, zone)
      },
      power(value) {
        this.$emit('power', this.object.id, value)
      },
      tap(state) {
        this.$emit('tap', this.object.id, state)
      },
      toughness(value) {
        this.$emit('toughness', this.object.id, value)
      },
      transform() {
        this.$emit('transform', this.object.id, this.object.card_faces.find((face) => face.id !== this.object.active_face.id).id)
      },
    },
  }
</script>