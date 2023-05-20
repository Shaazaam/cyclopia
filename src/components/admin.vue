<template>
  <div class="row">
    <div class="col text-center">
      <h1>App Stuff for Special People</h1>
    </div>
  </div>
  <div class="d-flex justify-content-center hstack gap-3">
    <button type="button" class="btn btn-primary" @click="catalog('creature-types')">Creature Types</button>
    <button type="button" class="btn btn-primary" @click="catalog('planeswalker-types')">Planeswalker Types</button>
    <button type="button" class="btn btn-primary" @click="catalog('land-types')">Land Types</button>
    <button type="button" class="btn btn-primary" @click="catalog('artifact-types')">Artifact Types</button>
    <button type="button" class="btn btn-primary" @click="catalog('enchantment-types')">Enchantment Types</button>
    <button type="button" class="btn btn-primary" @click="catalog('spell-types')">Spell Types</button>
    <button type="button" class="btn btn-primary" @click="catalog('keyword-abilities')">Keyword Abilities</button>
    <button type="button" class="btn btn-primary" @click="catalog('keyword-actions')">Keyword Actions</button>
    <button type="button" class="btn btn-primary" @click="catalog('ability-words')">Ability Words</button>
  </div>
</template>

<script>
  export default {
    methods: {
      catalog(kind) {
        this.fetch.post('/catalog', {kind})
      },
    },
  }
</script>