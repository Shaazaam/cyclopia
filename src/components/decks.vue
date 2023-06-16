<template>
  <div class="row">
    <div class="col text-center">
      <h2>Your Decks</h2>
      <p>Build a deck here: <a href="https://deckstats.net/" target="_blank">Deckstats</a></p>
    </div>
  </div>
  <p v-if="functions.isEmpty(decks)">You have no decks yet. Go <router-link :to="{name: 'import'}">here</router-link> to import</p>

  <nav>
    <div class="nav nav-tabs" role="tablist">
      <button
        v-for="(deck, index) in decks"
        type="button"
        class="nav-link"
        :class="{'active': index === selected}"
        @click="selected = index"
      >{{deck.name}}</button>
    </div>
  </nav>
  <div class="tab-content">
    <div
      v-for="(deck, index) in decks"
      class="fade mt-2"
      :class="{
        'row': index === selected,
        'show': index === selected,
        'tab-pane': index !== selected,
      }"
    >
      <Card
        v-for="object in cards.filter((card) => card.deck_id === deck.id)"
        :object="object"
        :actions="factory.actions({expand: false})"
        height="unset"
        class="col-3 mb-2"
      >
        <div class="card-body">
          <h5 class="text-center">Count: {{object.count}}</h5>
        </div>
      </Card>
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
      selected: 0,
      decks: [],
      cards: [],
    }),
    provide() {
      return {
        isGameOver: true,
      }
    },
    created() {
      this.fetch.get('/decks', {}, ({data}) => {
        this.decks = data
        this.fetch.get('/user-cards', {}, ({data}) => this.cards = data)
      })
    },
  }
</script>