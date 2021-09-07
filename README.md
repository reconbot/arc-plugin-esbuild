# arc-plugin-esbuild

Bundles arc functions with [esbuild](https://esbuild.github.io/), includes dependencies and tree shakes!

> [Arc serverless framework](https://arc.codes) plugin for compiling your functions with ESBuild Bundler

## Install

```bash
npm i --save-dev arc-plugin-esbuild
```

## Usage

After installing add `@plugins` and `@esbuild` pragmas to your `app.arc` file:

`app.arc`

```arc
@app
myapp

@esbuild

@http
get /

@plugins
arc-plugin-esbuild
```

File listing;

```sh
myapp/app.arc
myapp/package.json
myapp/tsconfig.json
myapp/src/http/get-index/index.ts
```

It's also worth ignoring the build artifacts.

```gitignore
#.gitignore

src/**/*.js
!src/macros/*.js  # these are not transpiled
!src/plugins/*.js # these are not transpiled
.esbuild
```

### Options

This plugin supports the following options under the `@esbuild` pragma:

|Option|Description|Example|
|---|---|---|
|`buildDirectory`| The directory to write the bundled files to. This directory will be used at deploy-time before bundling your functions for deployment. Defaults to `.esbuild`. |`buildDirectory .esbuild`|
|`entryFile`|A [glob](https://github.com/isaacs/node-glob#glob-primer) representing the file that should be used as entry point into your bundle. At `arc deploy` time, this pattern will be scoped to each Lambda function's directory before bundling each Lambda separately. At `arc sandbox` time, this pattern will be appended to `src/**/` when setting up the watcher process. If not specified the default will be `index.ts`.|`entryFile index.ts`|
|`target`| esbuild node target `node14 \| node12` | `target node14` |
|`external`| esbuild package externals defaults to `aws-sdk` | `external fs-extra aws-sdk` |

### Sandbox

Running `arc sandbox` kicks up the local development server Architect provides.
This plugin hooks into sandbox execution to watch and compile any typescript
files located under your project's `src/` directory (using the glob
`./src/**/<entry option || index.ts>`). It will create `index.js` files in each of your arc project's
Lambda function folders on sandbox startup, and will remove those when sandbox
shuts down.

It's recommended to gitignore the output js files.

### Deploy

Running `arc deploy` will bundle all functions using esbuild into your
`buildDirectory`-specified folder instead of `./src`, and use the bundled code when
deploying your functions to AWS.

## Sample Application

There is a sample application located under `sample-app/`. `cd` into that
directory, `npm install` and you can run locally via `arc sandbox` or deploy to
the internet via `arc deploy`.

## ⚠️ Known Issues

### Order of Arc Plugins Matter

**You probably want to list this plugin last under the `@plugins` section of your
`app.arc` because plugins are executed in the order that they appear in your
application manifest**. If you run this plugin before another plugin that creates
Lambdas, then the Lambda function code from the plugin will not be bundled.

### Mixing and Matching JS and TS `entryFile`

Mixing and matching JS and TS index files wont work. The `entryFile` must be the same for all functions.
