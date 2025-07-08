require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000; // Use process.env.PORT or default to 3000
const MONGO_URI = process.env.MONGO_URI;

// --- Database Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// --- Mongoose Schemas ---
const PostSchema = new mongoose.Schema({
    title: String,
    content: String,
    imageUrl: String,
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' } // Added status field
});
const Post = mongoose.model('Post', PostSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- Middleware ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_secret_key_for_sessions', // Use env variable for secret
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI })
}));

// Middleware to serve static files (public facing)
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve login page and its assets without protection
app.get('/admin/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});
app.get('/admin/login.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.js'));
});
app.get('/admin/dashboard.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.css'));
});
app.get('/admin/login.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.css'));
});

// Middleware to protect admin routes
const requireLogin = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    } else {
        return res.redirect('/admin/login.html');
    }
};

// Serve the admin dashboard (create post page)
app.use('/admin', requireLogin, express.static(path.join(__dirname, 'admin')));


// --- API Routes ---

// Test route to confirm server is running
app.get('/', (req, res) => {
    res.send('Blog Backend is Running!');
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.userId = user._id;
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
});

// Logout Route
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logout successful' });
    });
});

// Get all blog posts (public and admin view)
app.get('/api/posts', async (req, res) => {
    try {
        let query = {};
        // If user is logged in (admin), show all posts (drafts + published)
        // Otherwise, only show published posts for public view
        if (!(req.session && req.session.userId)) {
            query = { status: 'published' };
        }
        const posts = await Post.find(query).sort({ date: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single blog post by ID (for editing)
app.get('/api/posts/:id', async (req, res) => {
    console.log('Attempting to fetch single post with ID:', req.params.id);
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            console.log('Post not found for ID:', req.params.id);
            return res.status(404).json({ message: 'Post not found' });
        }
        console.log('Post found:', post.title);
        res.json(post);
    } catch (err) {
        console.error('Error fetching post by ID:', req.params.id, err);
        res.status(500).json({ message: err.message });
    }
});

// Create a new blog post with image upload
app.post('/api/posts', requireLogin, upload.single('featuredImage'), async (req, res) => {
    const newPost = new Post({
        title: req.body.title,
        content: req.body.content,
        imageUrl: req.file ? '/uploads/' + req.file.filename : null,
        status: req.body.status || 'draft' // Set status from request body, default to draft
    });

    try {
        const savedPost = await newPost.save();
        res.status(201).json(savedPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update an existing blog post with optional image upload
app.put('/api/posts/:id', requireLogin, upload.single('featuredImage'), async (req, res) => {
    console.log('Attempting to update post with ID:', req.params.id);
    console.log('Request Body:', req.body);
    if (req.file) {
        console.log('File uploaded:', req.file.filename);
    }
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            console.log('Post not found for update:', req.params.id);
            return res.status(404).json({ message: 'Post not found' });
        }

        post.title = req.body.title;
        post.content = req.body.content;
        if (req.file) {
            post.imageUrl = '/uploads/' + req.file.filename;
        }
        if (req.body.status) { // Update status if provided
            post.status = req.body.status;
        }

        const updatedPost = await post.save();
        console.log('Post updated successfully:', updatedPost.title);
        res.status(200).json(updatedPost);
    } catch (err) {
        console.error('Error updating post:', req.params.id, err);
        res.status(400).json({ message: err.message });
    }
});

// Delete a blog post
app.delete('/api/posts/:id', requireLogin, async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get dashboard stats
app.get('/api/stats', requireLogin, async (req, res) => {
    try {
        const postCount = await Post.countDocuments();
        const publishedPostCount = await Post.countDocuments({ status: 'published' });
        res.json({ postCount, publishedPostCount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});