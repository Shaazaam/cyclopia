<template>
  <div class="row">
    <Card
      v-for="object in objects"
      :object="object"
      :actions="actions"
      class="col-15"
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
    emits: ['expand', 'move'],
    methods: {
      expand(object) {
        this.$emit('expand', object)
      },
      move(id, zone) {
        this.$emit('move', id, zone)
      },
    },
  }
</script>