import { attrs, esc } from '#kit/utils';

/**
 * Text input.
 *
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} [opts.value]
 * @param {'text' | 'search' | 'email' | 'number' | 'url'} [opts.type]
 * @param {string} [opts.placeholder]
 * @param {Record<string, string | boolean>} [opts.attrs] Extra attributes.
 * @returns {string}
 */
export function input({ name, value = '', type = 'text', placeholder = '', attrs: extra = {} }) {
  return `<input class="kit-input" type="${esc(type)}" name="${esc(name)}" value="${esc(value)}"${attrs({ placeholder: placeholder || false, ...extra })}>`;
}
