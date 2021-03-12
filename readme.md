# plugin-parcel

> Arc serverless framework (arc.codes) plugin for compiling your functions with Parcel Bundler

## Install

```bash
npm i @copper/plugin-parcel
```

## ⚠️ Known Issue(s)

### Arc Application Directory Structure 

Due to the way parcel flattens directory structures, if you only have one
directory under `src/` (i.e. only `src/http`), this plugin won't work. You need
at least two directories under `src/` with at least one `.ts` file within them
(or in a further subtree below those directories) for the expected directory
structure to be maintained. This is why the sample app has both `@events` and
`@http` pragmas in it (to work around this issue).

### Order of Arc Plugins Matter

**You probably want to list this plugin last under the `@plugins` section of your
`app.arc` because plugins are executed in the order that they appear in your
application manifest**. If you run this plugin before another plugin that creates
Lambdas, then the Lambda function code from the plugin will not be bundled.

## Usage

After installing add `@plugins` and `@parcel` pragmas to your `app.arc` file:

```arc
@app
myapp

@parcel
outDir dist

@http
get /

@plugins
copper/plugin-parcel
```

### Custom Paths / Aliases

If you have custom aliases or paths set up for your project (i.e. you are using
the `compilerOptions.paths` property of `tsconfig.json`, or you use the `alias`
property inside your `package.json`) then you should also:

1. Add a `.babelrc` file to the root of your project that will inform parcel of
your custom path aliases, and
2. Ensure your `tsconfig.json` uses [parcel's tilde module resolution
   mechanism](https://parceljs.org/module_resolution.html#typescript-~-resolution).

Your `.babelrc` should look something like (note the `module-resolver` babel plugin is added
automatically by this plugin):

```
{
  "plugins": [
    [ "module-resolver", {
      "root": [ "./" ],
      "alias": {
        "~": "./"
      }
    } ]
  ]
}
```

... and a matching `tsconfig.json` would look like:

```
{
  "compilerOptions": {
    "allowJs": true,
    "baseUrl": ".",
    "rootDir": ".",
    "esModuleInterop": true,
    "module": "commonjs",
    "moduleResolution": "node",
    "paths": {
      "~/*": ["./*"]
    },
    "resolveJsonModule": true,
    "target": "esnext"
  },
  "exclude": [ "node_modules" ],
  "include": [ "src/**/*", "lib/*" ]
}
```

With the above configuration, your arc Lambda functions can reference modules
from `./lib` (relative to arc project root) like so:

```
import auth from '~/lib/auth';
```

### Options

This plugin supports the following options under the `@parcel` pragma:

|Option|Description|Example|
|---|---|---|
|`outDir`|**Required**. The directory to write the bundled files to. This directory will be used at deploy-time before bundling your functions for deployment.|`outDir dist`|
|`entry`|A [glob](https://github.com/isaacs/node-glob#glob-primer) representing the file that should be used as entry point into parcel. At `arc deploy` time, this pattern will be scoped to each Lambda function's directory before bundling each Lambda separately. At `arc sandbox` time, this pattern will be appended to `src/**/` when setting up the parcel watcher process. If not specified the default will be `index.ts`.|`entry index.tsx?`|

### Sandbox

Running `arc sandbox` kicks up the local development server Architect provides.
This plugin hooks into sandbox execution to watch and compile any typescript
files located under your project's `src/` directory (using the glob
`./src/**/<entry option || index.ts>`). It will create `index.js` files in each of your arc project's
Lambda function folders on sandbox startup, and will remove those when sandbox
shuts down.

### Deploy

Running `arc deploy` will bundle all functions using parcel into your
`outDir`-specified folder instead of `./src`, and use the bundled code when
deploying your functions to AWS.

## Sample Application

There is a sample application located under `sample-app/`. `cd` into that
directory, `npm install` and you can run locally via `arc sandbox` or deploy to
the internet via `arc deploy`.
