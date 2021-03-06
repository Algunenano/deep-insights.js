var _ = require('underscore');
var jasmineCfg = require('./grunt-tasks/jasmine');

function getTargetDiff () {
  var target = require('child_process').execSync('(git diff --name-only --relative || true;' +
                                                 'git diff origin/master.. --name-only --relative || true;)' +
                                                 '| grep \'\\.js\\?$\' || true').toString();
  if (target.length === 0) {
    target = ['.'];
  } else {
    target = target.split('\n');
    target.splice(-1, 1);
  }
  return target;
}

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  var pkg = grunt.file.readJSON('package.json');
  var version = pkg.version.split('.');

  var config = {
    dist: 'dist',
    tmp: '.tmp',
    version: {
      major: version[0],
      minor: version[0] + '.' + version[1],
      // set bugfix version to empty until we do the real release (aka 1.0)
      bugfixing: '' // pkg.version
    },
    pkg: pkg
  };

  var targetDiff = getTargetDiff();

  grunt.initConfig({
    config: config,
    pkg: grunt.file.readJSON('package.json'),
    browserify: require('./grunt-tasks/browserify'),
    clean: require('./grunt-tasks/clean'),
    concat: require('./grunt-tasks/concat'),
    connect: require('./grunt-tasks/connect'),
    copy: require('./grunt-tasks/copy'),
    cssmin: require('./grunt-tasks/cssmin'),
    exorcise: require('./grunt-tasks/exorcise'),
    imagemin: require('./grunt-tasks/imagemin'),
    jasmine: jasmineCfg,
    sass: require('./grunt-tasks/scss'),
    uglify: require('./grunt-tasks/uglify'),
    watch: require('./grunt-tasks/watch'),
    'gh-pages': require('./grunt-tasks/gh-pages'),
    s3: require('./grunt-tasks/s3').task(grunt, config),
    fastly: require('./grunt-tasks/fastly').task(grunt, config),
    eslint: { target: targetDiff }
  });

  // required for browserify to use watch files instead
  grunt.registerTask('preWatch', grunt.config.bind(grunt.config, 'config.doWatchify', true));

  grunt.registerTask('lint', [
    'eslint'
  ]);

  grunt.registerTask('verify-dependencies', 'check dependencies are shared with cartodb.js', require('./grunt-tasks/verify-dependencies')(grunt));

  grunt.registerTask('build-jasmine-specrunners', _
    .chain(jasmineCfg)
    .keys()
    .map(function (name) {
      return ['jasmine', name, 'build'].join(':');
    })
    .value());

  var baseTasks = [
    'clean:dist',
    'copy',
    'sass',
    'concat',
    'cssmin',
    'imagemin',
    'browserify',
    'build-jasmine-specrunners'
  ];

  grunt.registerTask('default', ['build']);
  grunt.registerTask('build', baseTasks.concat([
    'exorcise',
    'uglify'
  ]));
  grunt.registerTask('dev',
    _.chain(baseTasks)
      .clone()
      .tap(function (tasks) {
        var browserifyIdx = tasks.indexOf('browserify');
        tasks.splice(browserifyIdx, 0, 'preWatch'); // add preWatch before browserify task
        tasks.splice(tasks.length, 0, 'connect', 'watch'); // splice to append more tasks at end
      })
      .value()
  );
  grunt.registerTask('test', ['verify-dependencies', 'lint'].concat(baseTasks.concat([
    'jasmine'
  ])));
  grunt.registerTask('publish', ['build', 'gh-pages']);
  grunt.registerTask('release', function (target) {
    if (!grunt.file.exists('secrets.json')) {
      grunt.fail.fatal('secrets.json file does not exist, copy secrets.example.json and rename it', 1);
    }

    // Read secrets
    grunt.config.set('secrets', grunt.file.readJSON('secrets.json'));

    if (
      !grunt.config('secrets') ||
        !grunt.config('secrets').S3_KEY ||
        !grunt.config('secrets').S3_SECRET ||
        !grunt.config('secrets').S3_BUCKET
    ) {
      grunt.fail.fatal('S3 keys not specified in secrets.json', 1);
    }

    grunt.task.run(['s3', 'fastly']);
  });
};
