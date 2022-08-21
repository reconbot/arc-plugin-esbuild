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

@aws
runtime esbuild

@http
get /

@plugins
arc-plugin-esbuild
```

### Options

This plugin supports the following options under the `@esbuild` pragma:

|Option|Description|Example|
|---|---|---|
|`buildDirectory`| The directory to write the bundled files to. This directory will be used at deploy-time before bundling your functions for deployment. Defaults to `.esbuild`. If you use hydration it's recommended to set this to `src` and commingle your js and ts. |`buildDirectory .esbuild`|
|`external`| esbuild package externals defaults to `aws-sdk` [passed directly to esbuild](https://esbuild.github.io/api/#external) | `external '@prisma/client' aws-sdk` |
|`baseRuntime`| The lambda runtime we should target. Defaults to `nodejs16.x` | `baseRuntime nodejs14.x` |
|`configFile`| A config file that is passed to esbuild. This allows for esbuild plugins. It should be a commonjs .js file as it will be `required()`. You can override everything so be careful. See our source for existing build options. | `configFile .esbuildrc.js` |

### Hydration

Custom runtimes do not support any shared code or hydration.

## Sample Application

There is a sample application located under `sample-app/`. `cd` into that
directory, `npm install` and you can run locally via `arc sandbox` or deploy to
the internet via `arc deploy`.
