#!/usr/bin/env node
// cli.cjs
require('child_process').spawn('node', ['--experimental-modules', './dist/server.js'], { 
    stdio: 'inherit'
  });