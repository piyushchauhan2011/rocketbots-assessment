export default {
  paths: ['features/**/*.feature'],
  import: ['support/**/*.js', 'steps/**/*.js'],
  format: ['progress', 'html:cucumber-report.html'],
  formatOptions: { snippetInterface: 'async-await' },
}
