<template>
  <div class="row">
    <Card
      v-for="object in objects"
      :object="object"
      :actions="actions"
      class="col-3"
      @counter="counter"
      @expand="expand"
      @move="move"
    >
    </Card>
  </div>
</template>

<script>
  import Card from './card.vue'

  export default {
    components: {
      Card,
    },
    props: {
      actions: {
        type: Object,
        default: null,
      },
      objects: {
        type: Array,
        required: true,
      },
    },
    emits: [
      'counter',
      'expand',
      'move',
    ],
    methods: {
      counter(id, name, amount) {
        this.$emit('counter', id, name, amount)
      },
      expand(object) {
        this.$emit('expand', object)
      },
      move(id, zone) {
        this.$emit('move', id, zone)
      },
    },
  }
</script>