// Tiny i18n layer shared by the side panel and the options page.
// Manifest strings use __MSG_extName__ / __MSG_extDescription__ (resolved by the
// browser); page strings go through chrome.i18n with data-i18n attributes.

/** Translate a message key, substituting $1…$n placeholders. */
const t = (key, ...subs) => chrome.i18n.getMessage(key, subs.map(String)) || key

/** Fill [data-i18n], [data-i18n-placeholder] and [data-i18n-title] elements. */
const applyStatic = (root = document) => {
  for (const node of root.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n)
  for (const node of root.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder)
  for (const node of root.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle)
  const [lang] = chrome.i18n.getUILanguage().split('-')
  document.documentElement.lang = lang
}
