<template>
  <input
    :value="modelValue"
    :type="type"
    :id="id"
    :name="name"
    class="form-control"
    :class="{'is-invalid': functions.isNotEmpty(errors)}"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    @input="$emit('update:modelValue', $event.target.value)"
  />
  <div class="invalid-feedback">{{functions.isNotEmpty(errors) ? errors[name] : ''}}</div>
</template>

<script>
  export default {
    props: {
      modelValue: {
        type: [String, Number],
        required: true,
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
      placeholder: {
        type: String,
      },
      autocomplete: {
        type: String,
        default: 'on',
      },
    },
    emits: ['update:modelValue'],
  }
</script>