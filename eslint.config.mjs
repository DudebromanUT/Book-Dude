// Checks the app's files (docs/app) for names that are used without being defined or imported, such as a
// helper from another file used without its import line, and for things defined but never used.
// Run: npx eslint docs/app (CI runs it on every push).
const BROWSER = ['window', 'document', 'navigator', 'location', 'localStorage', 'indexedDB', 'setTimeout', 'clearTimeout',
  'requestAnimationFrame', 'IntersectionObserver', 'FileReader', 'Image', 'URL', 'URLSearchParams', 'Blob', 'File', 'history', 'console'];

export default [{
  files: ['docs/app/**/*.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: Object.fromEntries(BROWSER.map(name => [name, 'readonly']))
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['error', { caughtErrors: 'none' }]
  }
}];
