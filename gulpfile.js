var gulp = require('gulp');
var babel = require('gulp-babel');
var udder = require('udder');
var fs = require('fs');

gulp.task("babel", function() {
  return gulp.src('src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('lib'));
});

gulp.task("watch", function() {
  return gulp.watch('src/**/*.js', ["babel"]);
});

gulp.task("udder", ['babel'], function() {
  console.log("Writing generated utterances to udderances.txt");
  fs.writeFileSync('udderances.txt', udder(fs.readFileSync('utterances.txt').toString()));
});

gulp.task("default", ["udder"]);
