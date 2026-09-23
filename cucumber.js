export default {
  paths: ['tests/e2e/features/**/*.feature'],
  import: ['tests/e2e/support/**/*.js', 'tests/e2e/steps/**/*.js'],
  format: ['progress', 'html:cucumber-report.html'],
  formatOptions: { snippetInterface: 'async-await' },
}
