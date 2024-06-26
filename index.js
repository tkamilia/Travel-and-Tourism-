if (process.env.NODE_ENV !=="production"){
    require('dotenv').config()
}


const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const ExpressError = require('./utils/ExpressError');
const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/user')

const routesUS = require('./routes/routesUS')
const routesCP = require('./routes/routesCP')
const routesRV = require('./routes/routesRV')


const MongoDBStore = require("connect-mongo")(session);

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';


mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected")
})

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname,'public')))

const secret = process.env.SECRET ||'thisissecreat'

const store = new MongoDBStore({
    url: dbUrl,
    secret: 'Secreto!',
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})
const sessionConfig={
    store,
    secret:'wellok',
    resave:false,
    saveUninitialized:true,
    cookie :{
        httpOnly: true,
        expires: Date.now()+1000*60*60*24*7,
        maxAge:1000*60*60*24*7
    }
}
app.use(session(sessionConfig))
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req,res,next)=>{
    res.locals.currentUser = req.user
    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error')
    next()
})
app.get('', (req, res) => {
    res.render('subBody/home')
});
app.use('/',routesUS)
app.use('/campgrounds',routesCP)
app.use('/campgrounds/:id/reviews',routesRV)




app.all('*',(req,res,next)=>{
    next(new ExpressError('Page Not Found',404))
})
app.use((err, req, res, next) => {
    const {statusCode = 500}=err
    if(!err.message) err.message = 'Oh no,Something Went Wrong!'
    res.status(statusCode).render('gagal',{err})
})
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})

