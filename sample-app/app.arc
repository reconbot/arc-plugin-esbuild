@app
plugin-parcel-demo

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
copper/plugin-parcel

@parcel
outDir dist
