<template>
  <p>Now leaving Cyclopia. Goodbye.</p>
</template>

<script>
  export default {
    mounted() {
      this.fetch.del('/logout', {}, () => {
        this.storage.remove('user')
        this.store.clearUser()
        this.$router.push({name: 'login'})
      })
    },
  }
</script>