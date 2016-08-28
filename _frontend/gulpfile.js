'use strict';

var gulp = require('gulp');

// plugins
var stripDebug = require('gulp-strip-debug');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var ngAnnotate = require('gulp-ng-annotate')
var htmlreplace = require('gulp-html-replace');

gulp.task('lint', function () {
    gulp.src(['./app/**/*.js', '!./app/_bc/**', '!./app/_pc/**'])
        .pipe(jshint())
});
gulp.task('clean', function () {
    gulp.src('./dist')
        .pipe(clean({force: true}));
});
gulp.task('minify-css', function () {
    var opts = {comments: true, spare: true};
    gulp.src(['./app/**/*.css', '!./app/_bc/**', '!./app/_pc/**'])
        .pipe(minifyCSS(opts))
        .pipe(gulp.dest('./dist/'))
});
gulp.task('minify-js', function () {
    gulp.src(['./app/**/*.js', '!./app/_bc/**', '!./app/_pc/**'])
        .pipe(stripDebug())
        .pipe(ngAnnotate())
//        .pipe(uglify())
        .pipe(gulp.dest('./dist/'))
});

gulp.task('copy-bower-components', function () {
    gulp.src('./app/_bc/**')
        .pipe(gulp.dest('dist/_bc'));
});

gulp.task('copy-provided-components', function () {
    gulp.src('./app/_pc/**')
        .pipe(gulp.dest('dist/_pc'));
});

gulp.task('copy-html-files', function () {
    gulp.src([
	'./app/**/*.html', 
	'./app/**/*.png', 
	'./app/**/*.ico', 
	'./app/**/*.jpg', 
	
	'!./app/_bc/**', 
	'!./app/_pc/**'])
        .pipe(gulp.dest('dist/'));
});

// default task
gulp.task('default',
    ['lint']
);

gulp.task('build', function () {
    runSequence(
        ['clean'],
        ['lint', 'minify-css', 'minify-js', 'copy-html-files', 'copy-bower-components', 'copy-provided-components']
    );
});