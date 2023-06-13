<template>
  <div
    class="border rounded p-1"
    :class="{
      'border-warning': reversed,
      'bg-warning': reversed,
      'reverse-columns': reversed,
      'border-success': !reversed,
      'bg-success': !reversed,
      'bg-opacity-25': !reversed && dragover,
      'bg-opacity-10': !dragover,
    }"
    @dragenter="dragover = true"
    @dragleave="dragover = false"
  >
    <div class="row" :class="{'mb-2': !reversed}" :style="height">
      <div class="col-9">
        <div class="d-flex flex-wrap hstack">
          <template
            v-for="[id, cards] in Object.entries(creatures)"
          >
            <Card
              v-for="(object, i) in cards"
              :object="object"
              :actions="actions"
              :style="applyStyle(id, i, cards.length)"
              class="me-3"
              @details="details"
              @expand="expand"
              @tap="tap"
              @transform="transform"
              @mouseenter="hoverGroups[id] = i"
              @mouseleave="delete hoverGroups[id]"
            />
          </template>
        </div>
      </div>

      <div class="col-3">
        <div class="d-flex flex-wrap hstack">
          <template
            v-for="[id, cards] in Object.entries(instantsAndSorceries)"
          >
            <Card
              v-for="(object, i) in cards"
              :object="object"
              :style="applyStyle(id, i, cards.length)"
              class="me-3"
              @details="details"
              @expand="expand"
              @mouseenter="hoverGroups[id] = i"
              @mouseleave="delete hoverGroups[id]"
            />
          </template>
        </div>
      </div>
    </div>

    <div class="row" :class="{'mb-2': reversed}" :style="height">
      <div class="col-9">
        <div class="d-flex flex-wrap hstack">
          <template
            v-for="[id, cards] in Object.entries(lands)"
          >
            <Card
              v-for="(object, i) in cards"
              :object="object"
              :actions="actions"
              :style="applyStyle(id, i, cards.length)"
              class="me-3"
              @details="details"
              @expand="expand"
              @tap="tap"
              @transform="transform"
              @mouseenter="hoverGroups[id] = i"
              @mouseleave="delete hoverGroups[id]"
            />
          </template>
        </div>
      </div>
      <div class="col-3">
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
              :style="applyStyle(id, i, cards.length)"
              class="me-3"
              @details="details"
              @expand="expand"
              @tap="tap"
              @transform="transform"
              @mouseenter="hoverGroups[id] = i"
              @mouseleave="delete hoverGroups[id]"
            />
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
      actions: {
        type: Object,
        default: null,
      },
      objects: {
        type: Array,
        required: true,
      },
      reversed: {
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
      'details',
      'expand',
      'move',
      'power',
      'tap',
      'toughness',
      'transform',
    ],
    data: () => ({
      dragover: false,
      hoverGroups: {},
      group: {
        'margin-left': '-6rem',
        'margin-right': 'unset',
      },
      height: {
        'min-height': '15vh',
      },
    }),
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
      details(object, state) {
        this.$emit('details', object, state)
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