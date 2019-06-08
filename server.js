﻿'use strict'

const dotenv = require('dotenv')
const fs = require('fs')
const User = require('./models/user')
// .env
dotenv.config()

// override env-specific .env file
const node_env = process.env.NODE_ENV || 'development'
const envConfig = dotenv.parse(fs.readFileSync(`.env.${node_env}`))

for (let k in envConfig) {
  process.env[k] = envConfig[k]
}

process.env.NODE_ENV = node_env
process.env.PORT = process.env.PORT || (node_env === 'production' ? 80 : 3000)

//////////////////////////////////////////////////////////////////////////////////

const next = require('next')
const nextAuth = require('next-auth')
const nextAuthConfig = require('./next-auth.config')

const routes = {
  //admin: require('./routes/admin'),
  //account: require('./routes/account')
}

process.on('uncaughtException', function (err) {
  console.error('Uncaught Exception: ', err)
})

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection: Promise:', p, 'Reason:', reason)
})

// Initialize Next.js
const nextApp = next({
  dir: '.',
  dev: (process.env.NODE_ENV === 'development')
})

// Add next-auth to next app
nextApp
  .prepare()
  .then(() => {
    // Load configuration and return config object
    return nextAuthConfig()
  })
  .then(nextAuthOptions => {
    // Pass Next.js App instance and NextAuth options to NextAuth
    // Note We do not pass a port in nextAuthOptions, because we want to add some
    // additional routes before Express starts (if you do pass a port, NextAuth
    // tells NextApp to handle default routing and starts Express automatically).
    return nextAuth(nextApp, nextAuthOptions)
  })
  .then(nextAuthOptions => {
    // Get Express and instance of Express from NextAuth
    const express = nextAuthOptions.express
    const expressApp = nextAuthOptions.expressApp

    // Add admin routes
    //routes.admin(expressApp)

    // Add account management route - reuses functions defined for NextAuth
    //routes.account(expressApp, nextAuthOptions.functions)
    
    expressApp.post(`/auth/user`, (req, res) => {
      User.insert({ 
        email: req.body.email, 
        name: req.body.name, 
        password: req.body.password 
      }, user => {
        User.load({ email: req.body.email }, (err, user) => {
          console.log(user)
          req.login(user.attrs, (err) => {
            return res.redirect(`/auth/callback?action=signin&service=credentials`)
          })
        })
      })  
    })

    // Default catch-all handler to allow Next.js to handle all other routes
    expressApp.all('*', (req, res) => {
      let nextRequestHandler = nextApp.getRequestHandler()
      return nextRequestHandler(req, res)
    })

    expressApp.listen(process.env.PORT, err => {
      if (err) throw err
      console.log('> Ready on http://localhost:' + process.env.PORT + ' [' + process.env.NODE_ENV + ']')
    })
  })
  .catch(err => {
    console.log('An error occurred, unable to start the server')
    console.log(err)
  })
