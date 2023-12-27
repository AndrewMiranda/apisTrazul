//Libraries
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');

//Initializations
const app = express();

// Env
const envDeploy = process.env.NODE_ENV || "dev";

//Settings
app.set('port', process.env.PORT || 3001);
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload())
app.set('trust proxy', true);

// Public
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// config view engine
app.set('view engine', 'ejs');

//Routes
app.use('/', require('./routes/index'));

//Server que se ejecuta en producción y desarrollo pero no en test
if (envDeploy == "dev" || envDeploy == "production") {
    app.listen(app.get('port'), () => {
        console.log("Server on Port: ", app.get("port"));
    });
}

module.exports = app;