<template>
  <div class="row justify-content-center">
    <div class="col-4">
      <h2 class="text-center">Profile</h2>
      <form @submit.prevent="profile" novalidate>
        <Input
          v-model="user.email"
          id="email"
          type="email"
          name="email"
          placeholder="Email Address"
        />
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
        <button
          type="submit"
          class="btn btn-primary float-end"
          :disabled="isSaving"
        >Submit</button>
      </form>
    </div>
  </div>

  <div class="row justify-content-center">
    <div class="col-4">
      <h2 class="text-center">Change Password</h2>
      <form @submit.prevent="password" novalidate>
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
      password: '',
    }),
    created() {
      this.user = this.authUser
    },
    methods: {
      password() {
        this.fetch.put('/password', this.user)
      },
      profile() {
        this.fetch.put('/user', this.user, ({data: [user]}) => {
          this.storage.set('user', user)
          this.store.setUser(user)
        })
      },
    }
  }
</script>