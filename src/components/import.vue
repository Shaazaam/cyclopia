<template>
  <div class="row">
    <div class="col text-center">
      <h2>Import Deck from Text File</h2>
      <p>Note: Your deck will be the same name as the file uploaded</p>
    </div>
  </div>

  <div class="row">
    <div class="col"></div>
    <div class="col-6">
      <form class="row mb-2 align-items-center" @submit.prevent="submit">
        <div class="col-2"></div>
        <div class="col-6">
          <input
            @change="setFile"
            type="file"
            name="deck"
            ref="file"
            class="form-control"
            placeholder="Import Deck"
            required
          />
        </div>
        <div class="col-2">
          <button type="submit" class="btn btn-primary">Upload</button>
        </div>
        <div class="col-2"></div>
      </form>
      <div class="text-center">
        <p>To export from <a href="https://deckstats.net" target="_blank">Deckstats</a>, navigate to the desired deck</p>
        <p>Use the Tools drop down, select Download</p>
        <img src="/images/tools-download.png" />
        <p>In the modal, click Download as txt</p>
        <img src="/images/download-txt.png" />
      </div>
    </div>
    <div class="col"></div>
  </div>
</template>

<script>
  export default {
    data: () => ({
      file: null,
    }),
    methods: {
      setFile({target: {files: [file]}}) {
        this.file = file
      },
      submit() {
        let reader = new FileReader()
        reader.onload = (e) => {
          this.file = this.functions.copy(this.file, {
            base64: e.target.result.substring(e.target.result.indexOf('base64,') + 'base64,'.length),
          })
          this.fetch.post('/import', this.file, (data) => {
            this.file = null
            this.$refs.file.value = null
          })
        }
        reader.readAsDataURL(this.file)
      },
    },
  }
</script>