<template>
  <div :class="{'mb-3': hasMargin}">
    <div v-if="hasLabel" class="hstack gap-3">
      <label class="form-label" :class="{'is-invalid': hasErrors}" :for="id">
        <slot name="label">{{functions.snakeCasedToUpperCasedWords(name)}}</slot>
      </label>
      <div v-if="hasErrors" class="invalid-feedback">{{errors[name].join(', ')}}</div>
    </div>
    <div class="input-group">
      <slot name="inputGroupBefore"></slot>
      <select
        v-if="type === 'select'"
        :value="modelValue"
        :id="id"
        :name="name"
        class="form-control"
        :class="{'is-invalid': hasErrors}"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        @input="$emit('update:modelValue', $event.target.value)"
        @keyup.enter="$emit('keyupEnter')"
      >
        <option value="" disabled>{{placeholder}}</option>
        <slot name="options"></slot>
      </select>
      <input
        v-else
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
    </div>
    <slot name="helpText"></slot>
  </div>
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
      hasMargin: {
        type: Boolean,
        default: true,
      },
      hasLabel: {
        type: Boolean,
        default: true,
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