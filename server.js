const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const serverRoutes = require('./routes/serverRoutes');
const app = express();

// Heroku uses dynamic port
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration for Heroku (production)
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Only secure in production
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Use secure session store in production
if (process.env.NODE_ENV === 'production') {
    const MongoStore = require('connect-mongo');
    sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    });
}

app.use(session(sessionConfig));

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    // Simple admin authentication
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.admin = true;
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Invalid password' });
    }
});

app.use('/api', requireAdmin, serverRoutes);

app.get('/dashboard', requireAdmin, (req, res) => {
    res.render('dashboard');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Health check endpoint for Heroku
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
