document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const navLinks = document.querySelectorAll('.list-group-item');
    const logoutButton = document.getElementById('logout-button');

    let currentUserRole = 'author'; // Default, will be updated after login

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
        },
        'manage-users': {
            title: 'Manage Users',
            loader: loadManageUsers,
            roles: ['admin'] // Only accessible by admin
        },
        'create-user': {
            title: 'Create New User',
            loader: loadCreateUser,
            roles: ['admin'] // Only accessible by admin
        }
    };

    function setActiveLink(id) {
        navLinks.forEach(link => link.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    async function loadContent(routeName) {
        const route = routes[routeName];
        if (!route) return;

        // Role-based access control for frontend routes
        if (route.roles && !route.roles.includes(currentUserRole)) {
            alert('Access Denied: Insufficient role permissions.');
            return;
        }

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
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card bg-warning text-white h-100 shadow-sm">
                        <div class="card-body d-flex align-items-center justify-content-between">
                            <div>
                                <h5 class="card-title text-uppercase">Draft Posts</h5>
                                <h1 class="display-4">${stats.draftPostCount}</h1>
                            </div>
                            <i class="bi bi-pencil-square stat-card-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card bg-info text-white h-100 shadow-sm">
                        <div class="card-body d-flex align-items-center justify-content-between">
                            <div>
                                <h5 class="card-title text-uppercase">Pending Review</h5>
                                <h1 class="display-4">${stats.pendingReviewCount}</h1>
                            </div>
                            <i class="bi bi-hourglass-split stat-card-icon"></i>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card bg-danger text-white h-100 shadow-sm">
                        <div class="card-body d-flex align-items-center justify-content-between">
                            <div>
                                <h5 class="card-title text-uppercase">Rejected Posts</h5>
                                <h1 class="display-4">${stats.rejectedCount}</h1>
                            </div>
                            <i class="bi bi-x-circle stat-card-icon"></i>
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
                <td>${post.author ? post.author.username : 'N/A'}</td>
                <td>${new Date(post.date).toLocaleDateString()}</td>
                <td><span class="badge bg-${post.status === 'published' ? 'success' : post.status === 'draft' ? 'secondary' : post.status === 'pending_review' ? 'info' : 'danger'}">${post.status}</span></td>
                <td>
                    <button class="btn btn-info btn-sm edit-post" data-id="${post._id}"><i class="bi bi-pencil me-1"></i>Edit</button>
                    ${(currentUserRole === 'reviewer' || currentUserRole === 'admin') ? `
                        ${post.status === 'published' ?
                            `<button class="btn btn-warning btn-sm unpublish-post" data-id="${post._id}"><i class="bi bi-arrow-down-circle me-1"></i>Unpublish</button>` :
                            `<button class="btn btn-success btn-sm publish-post" data-id="${post._id}"><i class="bi bi-arrow-up-circle me-1"></i>Publish</button>`
                        }
                        ${post.status === 'pending_review' ?
                            `<button class="btn btn-danger btn-sm reject-post" data-id="${post._id}"><i class="bi bi-x-circle me-1"></i>Reject</button>` : ''
                        }
                    ` : ''}
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
                                    <th>Author</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${postRows.length > 0 ? postRows : '<tr><td colspan="5" class="text-center py-4">No posts found.</td></tr>'}
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
                            <label for="imageUrl" class="form-label">Featured Image URL (Optional)</label>
                            <input type="url" class="form-control" id="imageUrl" value="${post.imageUrl || ''}" placeholder="e.g., https://example.com/image.jpg">
                        </div>
                        <div class="mb-3">
                            <label for="featuredImage" class="form-label">Upload Featured Image (Optional)</label>
                            <input type="file" class="form-control" id="featuredImage" accept="image/*">
                            ${post.imageUrl ? `<img src="${post.imageUrl}" class="img-thumbnail mt-2" style="max-width: 200px;">` : ''}
                        </div>
                        <div class="mb-3">
                            <label for="content" class="form-label">Content</label>
                            <textarea id="content" rows="10">${post.content || ''}</textarea>
                        </div>
                        ${(currentUserRole === 'author' || currentUserRole === 'admin') ? `
                            <button type="submit" class="btn btn-secondary" data-status="draft" id="save-draft-btn"><i class="bi bi-save me-1"></i>Save Draft</button>
                            <button type="submit" class="btn btn-info ms-2" data-status="pending_review" id="submit-review-btn"><i class="bi bi-send me-1"></i>Submit for Review</button>
                        ` : ''}
                        ${(currentUserRole === 'reviewer' || currentUserRole === 'admin') ? `
                            <button type="submit" class="btn btn-success ms-2" data-status="published" id="publish-btn"><i class="bi bi-cloud-arrow-up me-1"></i>Publish</button>
                            <button type="submit" class="btn btn-danger ms-2" data-status="rejected" id="reject-btn"><i class="bi bi-x-circle me-1"></i>Reject</button>
                        ` : ''}
                    </form>
                    ${post.comments && post.comments.length > 0 ? `
                        <h6 class="mt-4">Reviewer Comments:</h6>
                        <ul class="list-group">
                            ${post.comments.map(comment => `<li class="list-group-item">${comment.text} <span class="badge bg-light text-secondary">${new Date(comment.createdAt).toLocaleDateString()}</span></li>`).join('')}
                        </ul>
                    ` : ''}
                    ${(currentUserRole === 'reviewer' || currentUserRole === 'admin') && isEdit ? `
                        <form id="add-comment-form" class="mt-3">
                            <div class="mb-3">
                                <label for="reviewerComment" class="form-label">Add Comment</label>
                                <textarea class="form-control" id="reviewerComment" rows="2"></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary btn-sm">Add Comment</button>
                        </form>
                    ` : ''}
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

    async function loadManageUsers() {
        const response = await fetch('/api/users');
        const users = await response.json();
        let userRows = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${user.role === 'admin' ? 'danger' : user.role === 'reviewer' ? 'primary' : 'secondary'}">${user.role}</span></td>
                <td>
                    ${user.role !== 'admin' ? `
                        <select class="form-select form-select-sm d-inline-block w-auto me-2 change-role-select" data-id="${user._id}">
                            <option value="author" ${user.role === 'author' ? 'selected' : ''}>Author</option>
                            <option value="reviewer" ${user.role === 'reviewer' ? 'selected' : ''}>Reviewer</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn btn-danger btn-sm delete-user" data-id="${user._id}"><i class="bi bi-person-x me-1"></i>Delete</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        mainContent.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Manage Users</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${userRows.length > 0 ? userRows : '<tr><td colspan="4" class="text-center py-4">No users found.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function loadCreateUser() {
        mainContent.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Create New User Account</h5>
                </div>
                <div class="card-body">
                    <form id="create-user-form">
                        <div class="mb-3">
                            <label for="newUsername" class="form-label">Username</label>
                            <input type="text" class="form-control" id="newUsername" required>
                        </div>
                        <div class="mb-3">
                            <label for="newEmail" class="form-label">Email</label>
                            <input type="email" class="form-control" id="newEmail" required>
                        </div>
                        <div class="mb-3">
                            <label for="newPassword" class="form-label">Password</label>
                            <input type="password" class="form-control" id="newPassword" required>
                        </div>
                        <div class="mb-3">
                            <label for="newUserRole" class="form-label">Role</label>
                            <select class="form-select" id="newUserRole" required>
                                <option value="author">Author</option>
                                <option value="reviewer">Reviewer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary"><i class="bi bi-person-plus me-1"></i>Create User</button>
                    </form>
                </div>
            </div>
        `;
    }

    // --- Event Listeners ---

    document.getElementById('nav-dashboard').addEventListener('click', (e) => { e.preventDefault(); loadContent('dashboard'); });
    document.getElementById('nav-manage-posts').addEventListener('click', (e) => { e.preventDefault(); loadContent('manage-posts'); });
    document.getElementById('nav-create-post').addEventListener('click', (e) => { e.preventDefault(); loadContent('create-post'); });
    // Add event listener for Manage Users link (only if admin)
    if (document.getElementById('nav-manage-users')) {
        document.getElementById('nav-manage-users').addEventListener('click', (e) => { e.preventDefault(); loadContent('manage-users'); });
    }
    // Add event listener for Create User link (only if admin)
    if (document.getElementById('nav-create-user')) {
        document.getElementById('nav-create-user').addEventListener('click', (e) => { e.preventDefault(); loadContent('create-user'); });
    }

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
            const imageUrl = document.getElementById('imageUrl').value; // Get URL from new input
            const featuredImageFile = document.getElementById('featuredImage').files[0];
            const status = e.submitter.dataset.status; // Get status from the clicked button

            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', content);
            formData.append('status', status);
            
            if (imageUrl) {
                formData.append('imageUrl', imageUrl); // Prioritize URL if provided
            } else if (featuredImageFile) {
                formData.append('featuredImage', featuredImageFile);
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
                const errorData = await response.json();
                alert(`${postId ? 'Failed to update' : 'Failed to create'} post: ${errorData.message || response.statusText}`);
            }
        } else if (e.target.id === 'add-comment-form') {
            e.preventDefault();
            const postId = document.getElementById('post-form').dataset.postId;
            const comment = document.getElementById('reviewerComment').value; // Changed from publisherComment
            if (!comment) return alert('Comment cannot be empty.');

            const response = await fetch(`/api/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment })
            });

            if (response.ok) {
                alert('Comment added successfully!');
                // Reload the post to show the new comment
                const postResponse = await fetch(`/api/posts/${postId}`);
                const post = await postResponse.json();
                loadCreatePost(post);
            } else {
                const errorData = await response.json();
                alert(`Failed to add comment: ${errorData.message || response.statusText}`);
            }
        } else if (e.target.id === 'create-user-form') { // New user creation form submission
            e.preventDefault();
            const username = document.getElementById('newUsername').value;
            const email = document.getElementById('newEmail').value;
            const password = document.getElementById('newPassword').value;
            const role = document.getElementById('newUserRole').value;

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role })
            });

            if (response.ok) {
                alert('User created successfully!');
                loadContent('manage-users'); // Go to manage users after creation
            } else {
                const errorData = await response.json();
                alert(`Failed to create user: ${errorData.message || response.statusText}`);
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
                    const errorData = await response.json();
                    alert(`Failed to delete post: ${errorData.message || response.statusText}`);
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
        } else if (e.target.classList.contains('publish-post') || e.target.classList.contains('unpublish-post') || e.target.classList.contains('reject-post')) {
            const postId = e.target.dataset.id;
            let newStatus;
            let comment = '';

            if (e.target.classList.contains('publish-post')) {
                newStatus = 'published';
            } else if (e.target.classList.contains('unpublish-post')) {
                newStatus = 'draft';
            } else if (e.target.classList.contains('reject-post')) {
                newStatus = 'rejected';
                comment = prompt('Please provide a reason for rejection:');
                if (comment === null || comment.trim() === '') {
                    return alert('Rejection requires a comment.');
                }
            }

            const response = await fetch(`/api/posts/${postId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, comment: comment })
            });
            if (response.ok) {
                alert(`Post status updated to ${newStatus} successfully!`);
                loadContent('manage-posts');
            } else {
                const errorData = await response.json();
                alert(`Failed to update post status: ${errorData.message || response.statusText}`);
            }
        } else if (e.target.classList.contains('change-role-select')) {
            const userId = e.target.dataset.id;
            const newRole = e.target.value;
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (response.ok) {
                alert(`User role updated to ${newRole} successfully!`);
                loadContent('manage-users');
            } else {
                const errorData = await response.json();
                alert(`Failed to update user role: ${errorData.message || response.statusText}`);
            }
        } else if (e.target.classList.contains('delete-user')) {
            const userId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this user?')) {
                const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
                if (response.ok) {
                    alert('User deleted successfully!');
                    loadContent('manage-users');
                } else {
                    const errorData = await response.json();
                    alert(`Failed to delete user: ${errorData.message || response.statusText}`);
                }
            }
        }
    });

    // Initial Load
    // Fetch user role after login to set up UI correctly
    async function initializeDashboard() {
        try {
            const response = await fetch('/api/user/role'); // New endpoint to get current user role
            if (response.ok) {
                const data = await response.json();
                currentUserRole = data.role;
                console.log('Current User Role detected:', currentUserRole); // DEBUG
                // Dynamically add Manage Users link if admin
                if (currentUserRole === 'admin') {
                    const manageUsersLink = document.createElement('a');
                    manageUsersLink.href = '#';
                    manageUsersLink.className = 'list-group-item list-group-item-action bg-dark text-white';
                    manageUsersLink.id = 'nav-manage-users';
                    manageUsersLink.innerHTML = '<i class="bi bi-people me-2"></i>Manage Users';
                    document.querySelector('.list-group').insertBefore(manageUsersLink, logoutButton.parentNode); // Insert before logout
                    manageUsersLink.addEventListener('click', (e) => { e.preventDefault(); loadContent('manage-users'); });

                    const createUserLink = document.createElement('a');
                    createUserLink.href = '#';
                    createUserLink.className = 'list-group-item list-group-item-action bg-dark text-white';
                    createUserLink.id = 'nav-create-user';
                    createUserLink.innerHTML = '<i class="bi bi-person-plus me-2"></i>Create User';
                    document.querySelector('.list-group').insertBefore(createUserLink, logoutButton.parentNode); // Insert before logout
                    createUserLink.addEventListener('click', (e) => { e.preventDefault(); loadContent('create-user'); });
                }
            } else {
                // If fetching role fails (e.g., not logged in), redirect to login
                console.warn('Failed to fetch user role. Redirecting to login.');
                window.location.href = '/admin/login.html';
            }
        } catch (error) {
            console.error('Error during dashboard initialization:', error);
            // Catch network errors during role fetch and redirect to login
            window.location.href = '/admin/login.html';
        }
        loadContent('dashboard');
    }

    initializeDashboard();
});