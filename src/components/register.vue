<template>
  <div class="row justify-content-center">
    <div class="col-4">
      <h2 class="text-center">Register</h2>
      <form @submit.prevent="submit" novalidate>
        <Input
          v-model="user.email"
          id="email"
          type="email"
          name="email"
          placeholder="Email Address"
        >
          <template #helpText>
            <div class="form-text text-light">
              Your email is only used for account/password recovery. It will never be shared.
            </div>
          </template>
        </Input>
        <Input
          v-model="user.handle"
          id="handle"
          type="text"
          name="handle"
          placeholder="User Handle"
        >
          <template #helpText>
            <div class="form-text text-light">
              Maximum of 50 characters.
            </div>
          </template>
        </Input>
        <Input
          v-model="user.password"
          id="password"
          type="password"
          name="password"
          placeholder="Password"
          autocomplete="off"
        />
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
        this.fetch.post('/register', this.user, ({data: [user]}) => {
          this.storage.set('user', user)
          this.store.setUser(user)
          this.$router.replace({name: 'home'})
          this.socket.connect()
        })
      },
    }
  }
</script>