document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const navLinks = document.querySelectorAll('.list-group-item');
    const logoutButton = document.getElementById('logout-button');

    const routes = {
        'dashboard': {
            title: 'Dashboard',
            loader: loadDashboard
        },
        'manage-posts': {
            title: 'Manage Posts',
            loader: loadManagePosts
        },
        'create-post': {
            title: 'Create New Post',
            loader: loadCreatePost
        }
    };

    function setActiveLink(id) {
        navLinks.forEach(link => link.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    async function loadContent(routeName) {
        const route = routes[routeName];
        if (!route) return;

        pageTitle.textContent = route.title;
        mainContent.innerHTML = '<div class="d-flex justify-content-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>'; // Show spinner
        await route.loader();
        setActiveLink(`nav-${routeName}`);
    }

    // --- Content Loaders ---

    async function loadDashboard() {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        mainContent.innerHTML = `
            <div class="row">
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card bg-primary text-white h-100 shadow-sm">
                        <div class="card-body d-flex align-items-center justify-content-between">
                            <div>
                                <h5 class="card-title text-uppercase">Total Posts</h5>
                                <h1 class="display-4">${stats.postCount}</h1>
                            </div>
                            <i class="bi bi-file-earmark-text stat-card-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card bg-success text-white h-100 shadow-sm">
                        <div class="card-body d-flex align-items-center justify-content-between">
                            <div>
                                <h5 class="card-title text-uppercase">Published Posts</h5>
                                <h1 class="display-4">${stats.publishedPostCount}</h1>
                            </div>
                            <i class="bi bi-check-circle stat-card-icon"></i>
                        </div>
                    </div>
                </div>
                <!-- Add more stat cards here if needed -->
            </div>
        `;
    }

    async function loadManagePosts() {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        let postRows = posts.map(post => `
            <tr>
                <td>${post.title}</td>
                <td>${new Date(post.date).toLocaleDateString()}</td>
                <td><span class="badge bg-${post.status === 'published' ? 'success' : 'secondary'}">${post.status}</span></td>
                <td>
                    <button class="btn btn-info btn-sm edit-post" data-id="${post._id}"><i class="bi bi-pencil me-1"></i>Edit</button>
                    ${post.status === 'published' ?
                        `<button class="btn btn-warning btn-sm unpublish-post" data-id="${post._id}"><i class="bi bi-arrow-down-circle me-1"></i>Unpublish</button>` :
                        `<button class="btn btn-success btn-sm publish-post" data-id="${post._id}"><i class="bi bi-arrow-up-circle me-1"></i>Publish</button>`
                    }
                    <button class="btn btn-danger btn-sm delete-post" data-id="${post._id}"><i class="bi bi-trash me-1"></i>Delete</button>
                </td>
            </tr>
        `).join('');

        mainContent.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-header bg-white">
                    <h5 class="mb-0">All Blog Posts</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${postRows.length > 0 ? postRows : '<tr><td colspan="4" class="text-center py-4">No posts found.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function loadCreatePost(post = {}) {
        const isEdit = !!post._id;
        mainContent.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-header bg-white">
                    <h5 class="mb-0">${isEdit ? 'Edit Blog Post' : 'Create New Blog Post'}</h5>
                </div>
                <div class="card-body">
                    <form id="post-form" enctype="multipart/form-data">
                        <div class="mb-3">
                            <label for="title" class="form-label">Title</label>
                            <input type="text" class="form-control" id="title" value="${post.title || ''}" required>
                        </div>
                        <div class="mb-3">
                            <label for="featuredImage" class="form-label">Featured Image</label>
                            <input type="file" class="form-control" id="featuredImage" accept="image/*">
                            ${post.imageUrl ? `<img src="${post.imageUrl}" class="img-thumbnail mt-2" style="max-width: 200px;">` : ''}
                        </div>
                        <div class="mb-3">
                            <label for="content" class="form-label">Content</label>
                            <textarea id="content" rows="10">${post.content || ''}</textarea>
                        </div>
                        <button type="submit" class="btn btn-secondary" data-status="draft" id="save-draft-btn"><i class="bi bi-save me-1"></i>Save Draft</button>
                        <button type="submit" class="btn btn-success ms-2" data-status="published" id="publish-btn"><i class="bi bi-cloud-arrow-up me-1"></i>Publish</button>
                    </form>
                </div>
            </div>
        `;
        tinymce.init({
            selector: 'textarea#content',
            plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
        });

        if (isEdit) {
            document.getElementById('post-form').dataset.postId = post._id;
        }
    }

    // --- Event Listeners ---

    document.getElementById('nav-dashboard').addEventListener('click', (e) => { e.preventDefault(); loadContent('dashboard'); });
    document.getElementById('nav-manage-posts').addEventListener('click', (e) => { e.preventDefault(); loadContent('manage-posts'); });
    document.getElementById('nav-create-post').addEventListener('click', (e) => { e.preventDefault(); loadContent('create-post'); });

    logoutButton.addEventListener('click', async () => {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/admin/login.html';
        } else {
            alert('Logout failed. Please try again.');
        }
    });

    mainContent.addEventListener('submit', async (e) => {
        if (e.target.id === 'post-form') {
            e.preventDefault();
            const form = e.target;
            const postId = form.dataset.postId;
            const title = document.getElementById('title').value;
            const content = tinymce.get('content').getContent();
            const featuredImage = document.getElementById('featuredImage').files[0];
            const status = e.submitter.dataset.status; // Get status from the clicked button

            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', content);
            formData.append('status', status);
            if (featuredImage) {
                formData.append('featuredImage', featuredImage);
            }

            const method = postId ? 'PUT' : 'POST';
            const url = postId ? `/api/posts/${postId}` : '/api/posts';

            const response = await fetch(url, {
                method: method,
                body: formData
            });

            if (response.ok) {
                alert(`${postId ? 'Post updated' : 'Post created'} successfully!`);
                loadContent('manage-posts');
            } else {
                alert(`${postId ? 'Failed to update' : 'Failed to create'} post`);
            }
        }
    });

    mainContent.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-post')) {
            const postId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this post?')) {
                const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
                if (response.ok) {
                    alert('Post deleted successfully!');
                    loadContent('manage-posts');
                } else {
                    alert('Failed to delete post');
                }
            }
        } else if (e.target.classList.contains('edit-post')) {
            const postId = e.target.dataset.id;
            console.log('Attempting to fetch post for editing with ID:', postId);
            try {
                const response = await fetch(`/api/posts/${postId}`);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response when fetching post for edit:', response.status, errorText);
                    throw new Error(`Failed to fetch post for edit: ${response.status}`);
                }
                const post = await response.json();
                console.log('Fetched post data for editing:', post);
                loadCreatePost(post);
            } catch (error) {
                console.error('Error in edit-post click handler:', error);
                alert('Could not load post details for editing.');
            }
        }
    });

    // Initial Load
    loadContent('dashboard');
});
