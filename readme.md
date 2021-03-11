# plugin-parcel

> Arc serverless framework (arc.codes) plugin for compiling your functions with Parcel Bundler

## Install

```bash
npm i @copper/plugin-parcel
```

## Known Issue(s)

⚠️ Due to the way parcel flattens directory structures, if you only have one
directory under `src/` (i.e. only `src/http`), this plugin won't work. You need
at least two directories under `src/` with at least one `.ts` file within them
(or in a further subtree below those directories) for the expected directory
structure to be maintained. This is why the sample app has both `@events` and
`@http` pragmas in it (to work around this issue).

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

### Options

This plugin supports the following options under the `@parcel` pragma:

|Option|Description|Example|
|---|---|---|
|`outDir`|**Required**. The directory to write the bundled files to. This directory will be used at deploy-time before bundling your functions for deployment.|`outDir dist`|

### Sandbox

Running `arc sandbox` kicks up the local development server Architect provides.
This plugin hooks into sandbox execution to watch and compile any typescript
files located under your project's `src/` directory (using the glob
`./src/**/*.ts`). It will create `index.js` files in each of your arc project's
Lambda function folders on sandbox startup, and will remove those when sandbox
shuts down.

### Deploy

Running `arc deploy` will bundle all functions using parcel into your
`outDir`-specified folder instead of `./src`.

## Sample Application

There is a sample application located under `sample-app/`. `cd` into that
directory, `npm install` and you can run locally via `arc sandbox` or deploy to
the internet via `arc deploy`.
