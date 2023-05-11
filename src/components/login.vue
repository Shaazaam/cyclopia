<template>
  <div class="row justify-content-center">
    <div class="col-6">
      <h2 class="text-center">Login</h2>
      <form @submit.prevent="submit" novalidate>
        <div class="row mb-3">
          <label for="email" class="col-2 col-form-label">Email</label>
          <div class="col-10">
            <Input
              v-model="user.email"
              id="email"
              type="email"
              name="email"
              placeholder="Email Address"
            />
          </div>
        </div>
        <div class="row mb-3">
          <label for="password" class="col-2 col-form-label">Password</label>
          <div class="col-10">
            <Input
              v-model="user.password"
              id="password"
              type="password"
              name="password"
              placeholder="Password"
              autocomplete="off"
            />
          </div>
        </div>
        <button
          type="submit"
          class="btn btn-primary float-end"
          :disabled="isSaving"
        >Submit</button>
      </form>
    </div>
  </div>
</template>

<script>
  import Input from './input.vue'

  export default {
    components: {
      Input,
    },
    data: () => ({
      user: null,
    }),
    created() {
      this.user = this.factory.user({password: ''})
    },
    methods: {
      submit() {
        this.fetch.post('/login', this.user, ([user]) => {
          this.storage.set('user', user)
          this.store.setUser(user)
          this.$router.push({name: 'home'})
          this.socket.connect()
        })
      },
    }
  }
</script>