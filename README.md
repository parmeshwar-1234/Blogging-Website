# Simple Blogging Website with Node.js and MongoDB

Welcome! This project is a simple, functional blogging website built with a Node.js backend and a classic HTML, CSS, and JavaScript frontend. It's designed to be a clear and straightforward example for anyone new to Node.js, demonstrating core concepts like building a server, creating a REST API, connecting to a database, and handling user authentication.

## Project Overview

The website has two main parts:
1.  **Public Blog:** Visitors can see a list of all blog posts, displayed with the most recent posts first.
2.  **Admin Panel:** A protected area where an administrator can log in to create new blog posts using a rich text editor.

## Technologies Used

*   **Backend:**
    *   **Node.js:** The JavaScript runtime environment that allows us to run JavaScript on the server.
    *   **Express.js:** A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. It simplifies the process of creating a server and handling requests.
    *   **MongoDB:** A NoSQL database used to store the blog posts.
    *   **Mongoose:** An Object Data Modeling (ODM) library for MongoDB and Node.js. It helps us define a structure (schema) for our data and makes it easier to interact with the database.
    *   **JSON Web Tokens (JWT):** Used for securing the admin routes. When the admin logs in, the server creates a token that the frontend sends back with each request to prove that the user is authenticated.
    *   **dotenv:** A module that loads environment variables from a `.env` file into `process.env`, which helps us keep sensitive information like database connection strings out of our main code.

*   **Frontend:**
    *   **HTML, CSS, & JavaScript:** The standard building blocks of the web.
    *   **TinyMCE:** A powerful and flexible rich text editor that replaces the standard `<textarea>`, allowing the admin to format blog posts with headings, bold text, lists, etc.

---

## Project Structure

Here is a breakdown of the key files and folders in the project:

```
/
├── admin/
│   ├── index.html      # The HTML file for the admin login and post creation page.
│   └── admin.js        # The JavaScript that handles admin login and creating new posts.
├── public/
│   ├── index.html      # The main HTML file for the public-facing blog.
│   ├── app.js          # The JavaScript that fetches and displays blog posts for the public page.
│   └── css/
│       └── styles.css  # The stylesheet for the entire website.
├── node_modules/       # This folder is created by npm and contains all the installed packages (like Express).
├── .env                # A file to store your secret MongoDB connection string. (You must create this!)
├── .gitignore          # Tells Git which files to ignore (like node_modules and .env).
├── package.json        # Contains project metadata and lists the project's dependencies.
├── server.js           # The heart of our application! This is the main backend file.
└── deloitte.pdf
```

---

## Setup and Installation

Follow these steps to get the project running on your local machine.

**Prerequisites:**
*   You must have [Node.js](https://nodejs.org/) installed.
*   You must have [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, OR have a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account for a cloud-hosted database.

**Step 1: Clone the Repository**
First, get the code onto your machine.
```bash
git clone <repository-url>
cd <repository-folder>
```

**Step 2: Install Dependencies**
Open your terminal in the project folder and run the following command. This will read the `package.json` file and download all the necessary packages into the `node_modules` folder.
```bash
npm install
```

**Step 3: Set Up Your Environment Variables**
You need to tell the application how to connect to your database.

1.  Create a new file in the root of the project named `.env`.
2.  Open the `.env` file and add the following line, replacing the placeholder with your actual MongoDB connection string:
    ```
    MONGO_URI="your_mongodb_connection_string_goes_here"
    ```
    *   **If using a local MongoDB instance,** your string will look like this: `mongodb://localhost:27017/blog`
    *   **If using MongoDB Atlas,** get the connection string from your cluster's "Connect" dialog. Make sure to replace `<username>` and `<password>` with your database user's credentials.

**Step 4: Start the Server**
Now you are ready to run the application!
```bash
node server.js
```
You should see a message in your terminal:
```
Server is running on http://localhost:3000
MongoDB connected
```

---

## How the Code Works: A Beginner's Guide

### `server.js` (The Backend)

This is where the magic happens. Let's break it down.

**1. Importing Modules:**
At the top, we import all the packages we need.
```javascript
require('dotenv').config(); // Loads the .env file
const express = require('express');
const mongoose = require('mongoose');
// ... and others
```

**2. Initializing Express and Middleware:**
We create an instance of an Express application and apply "middleware". Middleware are functions that process incoming requests before they reach our route handlers.
```javascript
const app = express();

// This allows our server to understand JSON data sent in requests.
app.use(bodyParser.json());

// This tells Express to serve all the files in the `public` and `admin` folders directly.
// This is how our HTML, CSS, and frontend JS files are made available to the browser.
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
```

**3. Connecting to MongoDB:**
We use Mongoose to connect to the database using the connection string from our `.env` file.
```javascript
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));
```

**4. Defining a Schema (The `Post` Model):**
A schema is a blueprint for our data. We are telling Mongoose that every `Post` in our database will have a `title`, `content`, and a `date`. Mongoose will ensure the data conforms to this structure.
```javascript
const PostSchema = new mongoose.Schema({
    title: String,
    content: String,
    date: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', PostSchema);
```

**5. Creating the API Routes:**
Routes define the URLs that our application will respond to.

*   **`GET /api/posts`:** This route fetches all posts from the database, sorts them by date, and sends them back as JSON.
    ```javascript
    app.get('/api/posts', async (req, res) => {
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);
    });
    ```

*   **`POST /api/login`:** This handles the admin login. It checks for a hardcoded username and password. If they match, it creates a JWT and sends it to the frontend.
    ```javascript
    app.post('/api/login', (req, res) => {
        // ... login logic ...
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    });
    ```

*   **`POST /api/posts`:** This route creates a new blog post. It is protected by our `verifyToken` middleware. If the request has a valid JWT, a new `Post` is created and saved to the database.
    ```javascript
    app.post('/api/posts', verifyToken, async (req, res) => {
        // ... create post logic ...
    });
    ```

### Frontend Files

*   **`public/app.js`:** When the main blog page loads, this script sends a `fetch` request to our backend's `/api/posts` endpoint. It then receives the list of posts and dynamically creates the HTML to display them on the page.

*   **`admin/admin.js`:** This script handles two things:
    1.  **Login:** It takes the username and password, sends them to `/api/login`, and saves the returned JWT if successful.
    2.  **Post Creation:** It gets the title and the rich text content from the TinyMCE editor and sends them to the `/api/posts` endpoint, including the JWT in the request headers to prove it's an authenticated admin.

---

## How to Use the Blog

1.  **View the Blog:** Open your browser and go to `http://localhost:3000`.
2.  **Log in as Admin:** Go to `http://localhost:3000/admin`.
3.  **Credentials:**
    *   Username: `admin`
    *   Password: `password`
4.  **Create a Post:** Once logged in, use the form and the rich text editor to write and submit a new blog post. It will immediately appear on the main blog page.
