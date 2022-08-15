@app
plugin-esbuild-demo

@http
get /
get /hi

@events
foo

@static
fingerprint true

@tables
data
  dateval *Number

@plugins
arc-plugin-esbuild

@esbuild
external aws-sdk '@prisma/client'
buildDirectory .esbuild
