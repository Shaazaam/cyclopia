<template>
  <select
    :value="modelValue"
    :id="id"
    :name="name"
    class="form-control"
    :class="{'is-invalid': hasErrors}"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    @input="$emit('update:modelValue', $event.target.value)"
  >
    <option value="" disabled hidden>{{placeholder}}</option>
    <slot></slot>
  </select>
  <div class="invalid-feedback">{{hasErrors ? errors[name].join(', ') : ''}}</div>
</template>

<script>
  export default {
    props: {
      modelValue: {
        type: [String, Number],
      },
      id: {
        type: String,
      },
      name: {
        type: String,
        required: true,
      },
      placeholder: {
        type: String,
      },
      autocomplete: {
        type: String,
        default: 'on',
      },
    },
    emits: ['update:modelValue'],
    computed: {
      hasErrors() {
        return this.functions.isNotEmpty(this.errors) && this.functions.isNotEmpty(this.errors[this.name])
      },
    },
  }
</script>