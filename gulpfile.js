let preprocessor = 'sass', // Preprocessor (sass, less, styl); 'sass' also work with the Scss syntax in blocks/ folder.
	fileswatch   = 'html,htm,txt,json,md,woff2' // List of files extensions for watching & hard reload

const { src, dest, parallel, series, watch } = require('gulp')
const browserSync  = require('browser-sync').create()
const bssi         = require('browsersync-ssi')
const ssi          = require('ssi')
const webpack      = require('webpack-stream')
const sass         = require('gulp-sass')
const sassglob     = require('gulp-sass-glob')
const less         = require('gulp-less')
const lessglob     = require('gulp-less-glob')
const styl         = require('gulp-stylus')
const stylglob     = require("gulp-empty")
const cleancss     = require('gulp-clean-css')
const autoprefixer = require('gulp-autoprefixer')
const rename       = require('gulp-rename')
const del          = require('del')

function browsersync() {
	browserSync.init({
		server: {
			baseDir: 'app/',
			middleware: bssi({ baseDir: 'app/', ext: '.html' })
		},
		ghostMode: false,
		notify: false,
		online: true
	})
}

function scripts() {
	return src(['app/js/*.js', '!app/js/*.min.js'])
		.pipe(webpack({
			mode: 'production',
			module: {
				rules: [
					{
						test: /\.(js)$/,
						exclude: /(node_modules)/,
						loader: 'babel-loader',
						query: {
							presets: ['@babel/env'],
							plugins: ['babel-plugin-root-import']
						}
					}
				]
			}
		})).on('error', function handleError() {
			this.emit('end')
		})
		.pipe(rename('app.min.js'))
		.pipe(dest('app/js'))
		.pipe(browserSync.stream())
}

function styles() {
	return src(['app/styles/*.*', '!app/styles/_*.*'])
		.pipe(eval(`${preprocessor}glob`)())
		.pipe(eval(preprocessor)())
		.pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true }))
		.pipe(cleancss({ level: { 1: { specialComments: 0 } },/* format: 'beautify' */ }))
		.pipe(rename({ suffix: ".min" }))
		.pipe(dest('app/css'))
		.pipe(browserSync.stream())
}

function buildcopy() {
	return src([
		'{app/js,app/css}/*.min.*',
		'app/images/**/*.*',
		'app/fonts/**/*'
	], { base: 'app/' })
	.pipe(dest('dist'))
}

async function buildhtml() {
	let includes = new ssi('app/', 'dist/', '/**/*.html')
	includes.compile()
	del('dist/parts', { force: true })
}

function cleandist() {
	return del('dist/**/*', { force: true })
}

function startwatch() {
	watch('app/styles/**/*', { usePolling: true }, styles)
	watch(['app/js/**/*.js', '!app/js/**/*.min.js'], { usePolling: true }, scripts)
	watch(`app/**/*.{${fileswatch}}`, { usePolling: true }).on('change', browserSync.reload)
}

exports.scripts = scripts
exports.styles  = styles
exports.assets  = series(scripts, styles)
exports.build   = series(cleandist, scripts, styles, buildcopy, buildhtml)
exports.default = series(scripts, styles, parallel(browsersync, startwatch))
