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
    status: { type: String, enum: ['draft', 'pending_review', 'published', 'rejected'], default: 'draft' }, // Added new statuses
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to author
    comments: [{ // For reviewer feedback
        text: String,
        createdAt: { type: Date, default: Date.now }
    }]
});
const Post = mongoose.model('Post', PostSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'reviewer', 'author'], default: 'author' } // Renamed publisher to reviewer
});
const User = mongoose.model('User', UserSchema);

// --- Multer Configuration for File Uploads ---
const storage = multer.memoryStorage(); // Use memoryStorage
const upload = multer({ storage: storage });

// --- Middleware ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_secret_key_for_sessions', // Use env variable for secret
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        httpOnly: true, // Prevents client-side JS from reading the cookie
        sameSite: 'Lax', // Protects against CSRF attacks
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
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
    console.log('requireLogin middleware triggered.'); // DEBUG
    console.log('req.session:', req.session); // DEBUG
    console.log('req.session.userId:', req.session ? req.session.userId : 'N/A'); // DEBUG

    if (req.session && req.session.userId) {
        return next();
    } else {
        console.log('User not logged in. Redirecting to login.'); // DEBUG
        return res.redirect('/admin/login.html');
    }
};

// Middleware to check user role
const requireRole = (role) => (req, res, next) => {
    if (req.session && req.session.role && (req.session.role === role || req.session.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Insufficient role permissions.' });
    }
};

// Serve the admin dashboard (create post page)
app.use('/admin', requireLogin, express.static(path.join(__dirname, 'admin')));


// --- API Routes ---

// Test route to confirm server is running
app.get('/', (req, res) => {
    res.send('Blog Backend is Running!');
});

// User Registration (Publicly accessible for authors)
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role: 'author' }); // Default role is author
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(400).json({ message: err.message });
    }
});

// Admin creates new user (Admin only)
app.post('/api/users', requireLogin, requireRole('admin'), async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        // Validate role input
        if (!['admin', 'reviewer', 'author'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ message: `User ${username} created successfully with role ${role}.` });
    } catch (err) {
        console.error('Error creating user by admin:', err);
        res.status(400).json({ message: err.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.userId = user._id;
        req.session.role = user.role; // Store user role in session
        console.log(`User ${user.username} logged in. Role stored in session: ${req.session.role}`); // DEBUG
        req.session.save(err => { // Explicitly save session
            if (err) {
                console.error('Error saving session after login:', err);
            }
            res.status(200).json({ message: 'Login successful' });
        });
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

// Get current user role (for frontend initialization)
app.get('/api/user/role', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            console.log('User not found for session ID:', req.session.userId);
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('Returning user role:', user.role, 'for user:', user.username); // DEBUG
        res.json({ role: user.role });
    } catch (err) {
        console.error('Error fetching user role:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get all blog posts (public and admin view)
app.get('/api/posts', async (req, res) => {
    try {
        let query = {};
        // If user is logged in (admin/reviewer), show all posts
        // If user is author, show only their posts
        // If public, show only published posts
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId);
            if (user.role === 'author') {
                query = { author: req.session.userId };
            }
        } else {
            query = { status: 'published' };
        }
        const posts = await Post.find(query).populate('author', 'username').sort({ date: -1 }); // Populate author username
        res.json(posts);
    } catch (err) {
        console.error('Error fetching all posts:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get a single blog post by ID (for editing)
app.get('/api/posts/:id', async (req, res) => {
    console.log('Attempting to fetch single post with ID:', req.params.id);
    try {
        const post = await Post.findById(req.params.id).populate('author', 'username');
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

// Create a new blog post with image upload or URL
app.post('/api/posts', requireLogin, upload.single('featuredImage'), async (req, res) => {
    console.log('POST /api/posts - Create new post request received.');
    console.log('Request Body:', req.body);
    if (req.file) {
        console.log('File received (will not be persistently saved):', req.file.originalname);
    }

    let imageUrlToSave = req.body.imageUrl; // Prioritize URL from form field
    // If no URL provided, and a file was uploaded, we acknowledge it but don't save it persistently
    // In a real app, req.file.buffer would be sent to cloud storage here.

    const newPost = new Post({
        title: req.body.title,
        content: req.body.content,
        imageUrl: imageUrlToSave, // Use the URL from the form or null
        status: req.body.status || 'draft', // Set status from request body, default to draft
        author: req.session.userId // Assign current user as author
    });

    try {
        const savedPost = await newPost.save();
        console.log('New post created successfully:', savedPost.title);
        res.status(201).json(savedPost);
    } catch (err) {
        console.error('Error creating new post:', err);
        res.status(400).json({ message: err.message });
    }
});

// Update an existing blog post with optional image upload or URL
app.put('/api/posts/:id', requireLogin, upload.single('featuredImage'), async (req, res) => {
    console.log('PUT /api/posts/:id - Update post request received for ID:', req.params.id);
    console.log('Request Body:', req.body);
    if (req.file) {
        console.log('File received (will not be persistently saved):', req.file.originalname);
    }
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            console.log('Post not found for update:', req.params.id);
            return res.status(404).json({ message: 'Post not found' });
        }

        // Permission check: Admin can edit any post. Author can only edit their own draft posts.
        if (req.session.role !== 'admin' && (post.author.toString() !== req.session.userId || post.status !== 'draft')) {
            return res.status(403).json({ message: 'Forbidden: You can only edit your own draft posts.' });
        }

        post.title = req.body.title;
        post.content = req.body.content;
        
        // Prioritize URL from form field
        if (req.body.imageUrl) {
            post.imageUrl = req.body.imageUrl;
        } else if (req.file) {
            // If no URL provided, but a file was uploaded, we acknowledge it but don't save it persistently
            console.warn('File uploaded but not saved persistently. Use cloud storage for production.');
        }
        // If neither URL nor file is provided, imageUrl remains unchanged

        if (req.body.status) { // Update status if provided
            // Reviewers/Admins can change status freely
            if (req.session.role === 'reviewer' || req.session.role === 'admin') {
                post.status = req.body.status;
            } else if (req.session.role === 'author' && req.body.status === 'pending_review') {
                // Authors can only change status to pending_review
                post.status = req.body.status;
            } else if (req.session.role === 'author' && req.body.status !== post.status) {
                // Authors cannot change status to anything else if it's not pending_review
                return res.status(403).json({ message: 'Forbidden: Authors can only submit for review.' });
            }
        }

        const updatedPost = await post.save(); // Use save() for full validation and hooks
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
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        // Permission check: Admin can delete any post. Author can only delete their own draft posts.
        if (req.session.role !== 'admin' && (post.author.toString() !== req.session.userId || post.status !== 'draft')) {
            return res.status(403).json({ message: 'Forbidden: You can only delete your own draft posts.' });
        }

        await Post.findByIdAndDelete(req.params.id);
        console.log('Post deleted successfully:', req.params.id);
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (err) {
        console.error('Error deleting post:', req.params.id, err);
        res.status(500).json({ message: err.message });
    }
});

// Update Post Status (Reviewer/Admin only)
app.put('/api/posts/:id/status', requireLogin, requireRole('reviewer'), async (req, res) => {
    const { status, comment } = req.body;
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.status = status;
        if (comment) {
            post.comments.push({ text: comment });
        }
        await post.save();
        res.status(200).json({ message: `Post status updated to ${status}` });
    } catch (err) {
        console.error('Error updating post status:', err);
        res.status(400).json({ message: err.message });
    }
});

// Add Comment to Post (Reviewer/Admin only)
app.post('/api/posts/:id/comment', requireLogin, requireRole('reviewer'), async (req, res) => {
    const { comment } = req.body;
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        post.comments.push({ text: comment });
        await post.save();
        res.status(200).json({ message: 'Comment added successfully' });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(400).json({ message: err.message });
    }
});

// Get all users (Admin only)
app.get('/api/users', requireLogin, requireRole('admin'), async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude password
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update user role (Admin only)
app.put('/api/users/:id/role', requireLogin, requireRole('admin'), async (req, res) => {
    const { role } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.role = role;
        await user.save();
        res.status(200).json({ message: `User role updated to ${role}` });
    } catch (err) {
        console.error('Error updating user role:', err);
        res.status(400).json({ message: err.message });
    }
});

// Delete user (Admin only)
app.delete('/api/users/:id', requireLogin, requireRole('admin'), async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get dashboard stats
app.get('/api/stats', requireLogin, async (req, res) => {
    try {
        const postCount = await Post.countDocuments();
        const publishedPostCount = await Post.countDocuments({ status: 'published' });
        const draftPostCount = await Post.countDocuments({ status: 'draft' });
        const pendingReviewCount = await Post.countDocuments({ status: 'pending_review' });
        const rejectedCount = await Post.countDocuments({ status: 'rejected' });
        res.json({ postCount, publishedPostCount, draftPostCount, pendingReviewCount, rejectedCount });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
