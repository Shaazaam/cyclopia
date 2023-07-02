<template>
  <p class="small mb-2" v-for="event in events">
    <span class="text-warning">{{functions.localeDateTime(event.created_on)}}</span>: {{getEventText(event)}}
  </p>
</template>

<script>
  export default {
    props: {
      events: {
        type: Array,
        required: true,
      },
    },
    methods: {
      getEventText(event) {
        const text = (() => ({
          'counter-card': (event) => `Placed ${event.data.amount} ${this.functions.toUpperCaseWords(event.data.counter)} Counters on ${event.card_name}`,
          'counter-user': (event) => `Received ${event.data.amount} ${this.functions.toUpperCaseWords(event.data.counter)} Counters`,
          'draw': (event) => `Drew a Card`,
          'end-game': (event) => `Lost the Game, ${event.winner} is the Winner`,
          'end-turn': (event) => `Ended Their Turn`,
          'life': (event) => `Changed Their Life to ${event.data.life}`,
          'mill': (event) => `Milled a Card`,
          'move': (event) => {
            let message = `Moved ${event.card_name} to the ${this.functions.toUpperCaseWords(event.data.zone)}`
            if (event.data.zone === 'remove') {
              message = `Removed ${event.card_name} from the Game`
            }
            return message
          },
          'mulligan': (event) => `Performed a Mulligan`,
          'power': (event) => `Changed the Power of ${event.card_name} to ${event.data.power}`,
          'scry': (event) => `Scried for ${event.data.amount}`,
          'shuffle': (event) => `Shuffled Their Deck`,
          'tap': (event) => `${event.data.is_tapped ? 'Tapped' : 'Untapped'} ${event.card_name}`,
          'token': (event) => `Created a ${event.card_name} Token`,
          'toughness': (event) => `Changed the Toughness of ${event.card_name} to ${event.data.toughness}`,
          'transfer': (event) => `Tranferred ${event.card_name} to ${event.new_controller}`,
          'transform': () => `Transformed a Card`,
          'untap': () => `Untapped Their Cards`,
        }))()[event.name]
        return `${event.handle} ${text(event)}`
      },
    },
  }
</script>