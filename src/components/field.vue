<template>
  <div class="row px-5">
    <div class="col-8">
      <div class="d-flex flex-wrap hstack">
        <template
          v-for="[id, cards] in Object.entries(creatures)"
        >
          <Card
            v-for="(object, i) in cards"
            :object="object"
            :actions="actions"
            class="me-3 mb-3"
            contain-height
            @counter="counter"
            @expand="expand"
            @move="move"
            @power="power"
            @tap="tap"
            @toughness="toughness"
            @transform="transform"
            @mouseenter="hoverGroups[id] = i"
            @mouseleave="delete hoverGroups[id]"
            :style="applyStyle(id, i, cards.length)"
          />
        </template>
      </div>
    </div>

    <div class="col-4">
      <div class="d-flex flex-wrap hstack">
        <template
          v-for="[id, cards] in Object.entries(instantsAndSorceries)"
        >
          <Card
            v-for="(object, i) in cards"
            :object="object"
            :actions="actions"
            class="me-3 mb-3"
            contain-height
            @expand="expand"
            @move="move"
            @mouseenter="hoverGroups[id] = i"
            @mouseleave="delete hoverGroups[id]"
            :style="applyStyle(id, i, cards.length)"
          />
        </template>
      </div>
    </div>
  </div>

  <div class="row px-5">
    <div class="col-8">
      <div class="d-flex flex-wrap hstack">
        <template
          v-for="[id, cards] in Object.entries(lands)"
        >
          <Card
            v-for="(object, i) in cards"
            :object="object"
            :actions="actions"
            class="me-3 mb-3"
            contain-height
            @counter="counter"
            @expand="expand"
            @move="move"
            @tap="tap"
            @transform="transform"
            @mouseenter="hoverGroups[id] = i"
            @mouseleave="delete hoverGroups[id]"
            :style="applyStyle(id, i, cards.length)"
          />
        </template>
      </div>
    </div>
    <div class="col-4">
      <div class="d-flex flex-wrap hstack">
        <div
          v-for="[id, cards] in Object.entries(artifactsAndEnchantments)"
          class="card-group"
          :class="id"
        >
          <Card
            v-for="(object, i) in cards"
            :object="object"
            :actions="actions"
            class="me-3 mb-3"
            contain-height
            @counter="counter"
            @expand="expand"
            @move="move"
            @tap="tap"
            @transform="transform"
            @mouseenter="hoverGroups[id] = i"
            @mouseleave="delete hoverGroups[id]"
            :style="applyStyle(id, i, cards.length)"
          />
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
    data: () => ({
      hoverGroups: {},
      group: {
        'margin-left': '-6rem',
        'margin-right': 'unset',
      },
    }),
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
        return this.functions.groupBy(this.objects.filter(({card}) => (
          card.type_line.includes('Artifact')
          || card.type_line.includes('Enchantment')
          || card.type_line.includes('Planeswalker')
        ) && !card.type_line.includes('Creature')), 'card_id')
      },
      creatures() {
        return this.functions.groupBy(this.objects.filter(({card}) => card.type_line.includes('Creature')), 'card_id')
      },
      instantsAndSorceries() {
        return this.functions.groupBy(this.objects.filter(({card}) => (card.type_line.includes('Instant')
          || card.type_line.includes('Sorcery')) && !card.type_line.includes('Creature')), 'card_id')
      },
      lands() {
        return this.functions.groupBy(this.objects.filter(({card}) => card.type_line.includes('Land')), 'card_id')
      },
    },
    methods: {
      applyStyle(id, index, length) {
        if (index > 0 && (!(id in this.hoverGroups) || index !== this.hoverGroups[id] + 1)) {
          return this.group
        }
      },
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