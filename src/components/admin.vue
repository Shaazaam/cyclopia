<template>
  <div class="row">
    <div class="col text-center">
      <h1>App Stuff for Special People</h1>
    </div>
  </div>
  <div class="row">
    <div class="col text-center">
      <h2>Bulk Data</h2>
    </div>
  </div>
  <div class="d-flex justify-content-center hstack gap-3 mb-3">
    <button
      type="button"
      class="btn btn-primary"
      :disabled="waiting.includes('cards')"
      @click="cards"
    >Cards</button>
    <button
      type="button"
      class="btn btn-primary"
      :disabled="waiting.includes('rulings')"
      @click="rulings"
    >Rulings</button>
  </div>
  <div class="row">
    <div class="col text-center">
      <h2>Catalog</h2>
    </div>
  </div>
  <div class="d-flex justify-content-center hstack gap-3">
    <button
      v-for="kind in catalogs"
      type="button"
      class="btn btn-primary"
      :disabled="waiting.includes(kind)"
      @click="catalog(kind)"
    >{{functions.kebabCasedToUpperCasedWords(kind)}}</button>
  </div>
</template>

<script>
  export default {
    data: () => ({
      catalogs: [
        'creature-types',
        'planeswalker-types',
        'land-types',
        'artifact-types',
        'enchantment-types',
        'spell-types',
        'keyword-abilities',
        'keyword-actions',
        'ability-words',
      ],
      waiting: [],
    }),
    methods: {
      cards() {
        this.waiting = this.waiting.concat('cards')
        this.fetch.post('/cards', {}, () => this.waiting = this.waiting.filter((x) => x !== 'cards'))
      },
      catalog(kind) {
        this.waiting = this.waiting.concat(kind)
        this.fetch.post('/catalog', {kind}, () => this.waiting = this.waiting.filter((x) => x !== kind))
      },
      rulings() {
        this.waiting = this.waiting.concat('rulings')
        this.fetch.post('/rulings', {}, () => this.waiting = this.waiting.filter((x) => x !== 'rulings'))
      },
    },
  }
</script>