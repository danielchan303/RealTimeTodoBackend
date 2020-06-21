require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

// connect to db
var db = require('./database');

// load firebase
var admin = require("./firebase");

// config cors
var cors = require('cors');
app.use(cors({
    origin: "*",
    credentials: true
}));

// extract auth token
app.use((req, res, next) => {
    const token = req.get('Authorization');
    if (token) {
        req.token = token.split(" ")[1];
    }
    return next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
