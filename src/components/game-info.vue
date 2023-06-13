<template>
  <div class="row mb-2">
    <div
      class="col-4 hstack gap-2"
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
      <div v-for="{name} in counters.toReversed()" class="input-group">
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
      class="col-4 hstack gap-2"
      :class="{'invisible': !user1.is_ready}"
    >
      <div v-for="{name} in counters" class="input-group">
        <span class="input-group-text bg-dark text-light">{{functions.toUpperCaseWords(name)}}</span>
        <input
          v-if="user1.user_id === authUser.id && !isGameOver"
          type="number"
          class="form-control"
          :value="user1.counters[name]"
          @change="(e) => counter(name, e.target.value)"
        />
        <input
          v-else
          type="text"
          class="form-control bg-dark text-light"
          :value="user1.counters[name]"
          disabled
        />
      </div>
      <div class="input-group">
        <span class="input-group-text bg-dark text-light">Life</span>
        <input
          v-if="user1.user_id === authUser.id && !isGameOver"
          type="number"
          class="form-control"
          :value="user1.life"
          @change="(e) => life(e.target.value)"
        />
        <input
          v-else
          type="text"
          class="form-control bg-dark text-light"
          :value="user1.life"
          disabled
        />
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: {
      counters: {
        type: Array,
        required: true,
      },
      user0: {
        type: Object,
        required: true,
      },
      user1: {
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
      'counter',
      'life',
    ],
    methods: {
      counter(name, value) {
        this.$emit('counter', name, value)
      },
      life(amount) {
        this.$emit('life', amount)
      },
    },
  }
</script>