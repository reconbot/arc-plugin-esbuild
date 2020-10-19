# arc-macro-parcel

Bundle functions in Architect projects with parcel

## Install

```bash
npm i arc-macro-parcel
```

### Usage

After installing add something the following to the `.arc` file:

```arc
@app
myapp

@parcel
outDir dist
minify true

@http
get /

@macros
arc-macro-parcel
```

Running `arc deploy` will bundle all functions using parcel then
deploy the `./dist` folder instead of `./src`.
