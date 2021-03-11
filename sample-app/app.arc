@app
plugin-parcel-demo

@http
get /
get /hi

@static
fingerprint true

@tables
data
  dateval *Number

@plugins
copper/plugin-parcel

@src
dist
