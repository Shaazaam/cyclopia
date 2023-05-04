<template>
  <div class="row justify-content-center">
    <div class="col-6">
      <h2 class="text-center">Register</h2>
      <form @submit.prevent="submit">
        <div class="row mb-3">
          <label for="email" class="col-2 col-form-label">Email</label>
          <div class="col-10">
            <input
              v-model="user.email"
              id="email"
              type="email"
              name="email"
              class="form-control"
              placeholder="Email Address"
              required
            />
          </div>
        </div>
        <div class="row mb-3">
          <label for="handle" class="col-2 col-form-label">Handle</label>
          <div class="col-10">
            <input
              v-model="user.handle"
              id="handle"
              type="text"
              name="handle"
              class="form-control"
              placeholder="User Handle"
              required
            />
          </div>
        </div>
        <div class="row mb-3">
          <label for="password" class="col-2 col-form-label">Password</label>
          <div class="col-10">
            <input
              v-model="user.password"
              id="password"
              type="password"
              name="pass"
              class="form-control"
              placeholder="Password"
              autocomplete="off"
              required
            />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
    </div>
  </div>
</template>

<script>
  export default {
    data: () => ({
      user: null,
    }),
    created() {
      this.user = this.factory.user({password: ''})
    },
    methods: {
      submit() {
        this.fetch.post('/register', this.user, ([user]) => {
          this.storage.set('user', user)
          this.store.setUser(user)
          this.$router.replace({name: 'home'})
          this.socket.connect()
        })
      },
    }
  }
</script>