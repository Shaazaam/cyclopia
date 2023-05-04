<template>
  <div class="row px-5">
    <div class="col-8">
      <div class="row">
        <Card
          v-for="object in creatures"
          :object="object"
          :actions="actions"
          class="col-2"
          @counter="counter"
          @expand="expand"
          @move="move"
          @power="power"
          @tap="tap"
          @toughness="toughness"
          @transform="transform"
        >
        </Card>
      </div>
    </div>

    <div class="col-4">
      <div class="row">
        <Card
          v-for="object in instantsAndSorceries"
          :object="object"
          :actions="actions"
          class="col-4"
          @expand="expand"
          @move="move"
        >
        </Card>
      </div>
    </div>
  </div>

  <div class="row px-5">
    <div class="col-8">
      <div class="row">
        <Card
          v-for="object in lands"
          :object="object"
          :actions="actions"
          class="col-2"
          @counter="counter"
          @expand="expand"
          @move="move"
          @tap="tap"
          @transform="transform"
        >
        </Card>
      </div>
    </div>
    <div class="col-4">
      <div class="row">
        <Card
          v-for="object in artifactsAndEnchantments"
          :object="object"
          :actions="actions"
          class="col-4"
          @counter="counter"
          @expand="expand"
          @move="move"
          @tap="tap"
          @transform="transform"
        >
        </Card>
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
      'power',
      'tap',
      'toughness',
      'transform',
    ],
    computed: {
      artifactsAndEnchantments() {
        return this.objects.filter(({card}) => (
          card.type_line.includes('Artifact')
          || card.type_line.includes('Enchantment')
          || card.type_line.includes('Planeswalker')
        ) && !card.type_line.includes('Creature'))
      },
      creatures() {
        return this.objects.filter(({card}) => card.type_line.includes('Creature'))
      },
      instantsAndSorceries() {
        return this.objects.filter(({card}) => (card.type_line.includes('Instant') || card.type_line.includes('Sorcery')) && !card.type_line.includes('Creature'))
      },
      lands() {
        return this.objects.filter(({card}) => card.type_line.includes('Land'))
      },
    },
    methods: {
      counter(id, name, amount) {
        this.$emit('counter', id, name, amount)
      },
      expand(object) {
        this.$emit('expand', object)
      },
      move(object_id, zone) {
        this.$emit('move', object_id, zone)
      },
      power(object_id, value) {
        this.$emit('power', object_id, value)
      },
      tap(object_id, state) {
        this.$emit('tap', object_id, state)
      },
      toughness(object_id, value) {
        this.$emit('toughness', object_id, value)
      },
      transform(object_id, card_face_id) {
        this.$emit('transform', object_id, card_face_id)
      },
    },
  }
</script>