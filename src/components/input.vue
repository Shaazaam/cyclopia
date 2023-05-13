<template>
  <slot name="inputGroupBefore"></slot>
  <input
    :value="modelValue"
    :type="type"
    :id="id"
    :name="name"
    class="form-control"
    :class="{'is-invalid': hasErrors}"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    :min="min"
    :max="max"
    @input="$emit('update:modelValue', $event.target.value)"
    @keyup.enter="$emit('keyupEnter')"
  />
  <slot name="inputGroupAfter"></slot>
  <div v-if="hasErrors" class="invalid-feedback">{{errors[name].join(', ')}}</div>
</template>

<script>
  export default {
    props: {
      modelValue: {
        type: [String, Number],
      },
      type: {
        type: String,
        required: true,
      },
      id: {
        type: String,
      },
      name: {
        type: String,
        required: true,
      },
      min: {
        type: Number,
      },
      max: {
        type: Number,
      },
      placeholder: {
        type: String,
      },
      autocomplete: {
        type: String,
        default: 'on',
      },
    },
    emits: ['update:modelValue', 'keyupEnter'],
    computed: {
      hasErrors() {
        return this.functions.isNotEmpty(this.errors) && this.functions.isNotEmpty(this.errors[this.name])
      },
    },
  }
</script>