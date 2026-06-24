const gulp = require('gulp');
const prefix = require('gulp-autoprefixer');
const through2 = require("through2");
const yaml = require("js-yaml");
const Datastore = require("nedb");
const cb = require("cb");
const merge = require("merge-stream");
const clean = require("gulp-clean");
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass')(require('sass'));
const fs = require("fs");
const path = require("path");
const zip = require("gulp-zip");

const util = require('util');
if (!util.isDate) {
  util.isDate = (d) => Object.prototype.toString.call(d) === '[object Date]';
}

const SYSTEM = JSON.parse(fs.readFileSync("src/system.json"));
const SYSTEM_SCSS = ["src/scss/**/*.scss"];
const STATIC_FILES = [
  "src/icons/**/*",
  "src/module/**/*",
  "!src/module/foundry-core/**",
  "src/templates/**/*",
  "src/images/**/*",
  "src/lang/**/*.json",
  "src/*.json",
  "src/packs/*.db"
];
const PACK_SRC = "src/packs";
const BUILD_DIR = "build/rogue-trader-3rd";

/* ----------------------------------------- */
/*  Compile Packs
/* ----------------------------------------- */

function compilePacks() {
  // determine the source folders to process
  const folders = fs.readdirSync(PACK_SRC).filter((file) => {
    return fs.statSync(path.join(PACK_SRC, file)).isDirectory();
  });

  // process each folder into a compendium db
  const packs = folders.map((folder) => {
    const dbPath = path.resolve(__dirname, BUILD_DIR, "packs", `${folder}.db`);
    // If the folder has YAML, treat YAML as the sole source-of-truth: wipe any
    // .db that copyFiles may have placed there from src/packs/*.db (the upstream
    // DH2 fork still ships stale pre-built .db files at that path). Without this,
    // NeDB autoload merges old fork content on top of the YAML.
    const hasYaml = fs.readdirSync(path.join(PACK_SRC, folder)).some((f) => f.endsWith(".yml"));
    if (hasYaml && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const db = new Datastore({ filename: dbPath, autoload: true });
    return gulp.src(path.join(PACK_SRC, folder, "/**/*.yml")).pipe(
        through2.obj((file, enc, cb) => {
          try {
            const fileContents = file.contents.toString();
            let json = yaml.loadAll(fileContents);
            db.insert(json, (err, newDoc) => {
              if (err) {
                console.error(`Error inserting into Datastore:`, err);
              }
            });
            cb(null, file);
          } catch (err) {
            console.error(`Error processing file ${file.path}:`, err);
            cb(err, file);
          }
        })
    );
  });
  return merge.call(null, packs);
}

/* ----------------------------------------- */
/*  Compile Sass
/* ----------------------------------------- */

// Small error handler helper function.
function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

function compileScss() {
  // Configure options for sass output. For example, 'expanded' or 'nested'
  let options = {
    outputStyle: 'expanded'
  };
  return gulp.src(SYSTEM_SCSS)
    .pipe(
      sass(options)
        .on('error', handleError)
    )
    .pipe(prefix({
      cascade: false
    }))
    .pipe(gulp.dest(BUILD_DIR + "/css"))
}
const css = gulp.series(compileScss);

/* ----------------------------------------- */
/*  Copy Static
/* ----------------------------------------- */

function copyFiles() {
  return gulp.src(STATIC_FILES, {base: "src",}).pipe(gulp.dest(BUILD_DIR));
}

/* ----------------------------------------- */
/*  Other
/* ----------------------------------------- */

function cleanBuild() {
  return gulp.src(`${BUILD_DIR}`, { allowEmpty: true }, { read: false }).pipe(clean({force: true}));
}

function watchUpdates() {
  return gulp.watch(STATIC_FILES, gulp.series(cleanBuild, compileScss, compilePacks, copyFiles));
}

function watchCopy() {
  return gulp.watch(STATIC_FILES, gulp.series(copyFiles));
}

function createArchive() {
  return gulp.src(`${BUILD_DIR}/**`)
      .pipe(zip(`rogue-trader-3rd-vtt-${SYSTEM.version}.zip`))
      .pipe(gulp.dest('./archive'));
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.clean = gulp.series(cleanBuild);
exports.scss = gulp.series(compileScss);
exports.packs = gulp.series(compilePacks);
exports.copy = gulp.series(copyFiles, watchCopy);
// Lean verification build: clean + scss + copy + packs, WITHOUT the release-zip
// step (createArchive) that `build` ends with. This is the Ralph-loop gate target
// (`npm run build:check`) — catches SCSS/template/pack/syntax breakage without the
// OOM-prone archive step.
exports.compile = gulp.series(cleanBuild, compileScss, copyFiles, compilePacks);
exports.build = gulp.series(cleanBuild, compileScss, copyFiles, compilePacks, createArchive);
exports.default = gulp.series(cleanBuild, compileScss, copyFiles, compilePacks, watchUpdates);
