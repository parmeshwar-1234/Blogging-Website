document.addEventListener('DOMContentLoaded', () => {
    const postsContainer = document.getElementById('posts-container');
    const blogPostModal = new bootstrap.Modal(document.getElementById('blogPostModal'));
    const modalTitle = document.getElementById('blogPostModalLabel');
    const modalImage = document.getElementById('modal-post-image');
    const modalContent = document.getElementById('modal-post-content');

    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/posts');
            const posts = await response.json();
            displayPosts(posts);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    };

    const displayPosts = (posts) => {
        postsContainer.innerHTML = '';
        const publishedPosts = posts.filter(post => post.status === 'published');

        publishedPosts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.classList.add('post-card');
            // Ensure post.content exists before calling substring
            const snippet = post.content ? post.content.substring(0, 150) + '...' : '';
            postCard.innerHTML = `
                ${post.imageUrl ? `<img src="${post.imageUrl}" class="card-img-top" alt="Featured Image">` : ''}
                <div class="post-card-body">
                    <h2 class="card-title">${post.title}</h2>
                    <p class="date">${new Date(post.date).toLocaleDateString()}</p>
                    <p class="card-text">${snippet}</p> <!-- Show a snippet -->
                </div>
                <div class="post-card-footer">
                    <button type="button" class="btn btn-primary read-more-btn" data-id="${post._id}">Read More</button>
                </div>
            `;
            postsContainer.appendChild(postCard);
        });
    };

    postsContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('read-more-btn')) {
            const postId = e.target.dataset.id;
            try {
                const response = await fetch(`/api/posts/${postId}`);
                
                // --- DEBUGGING LOGS START ---
                console.log('Response Status for single post:', response.status);
                const responseText = await response.text();
                console.log('Response Text for single post:', responseText);
                // --- DEBUGGING LOGS END ---

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
                }

                const post = JSON.parse(responseText); // Parse after logging text

                modalTitle.textContent = post.title;
                if (post.imageUrl) {
                    modalImage.src = post.imageUrl;
                    modalImage.style.display = 'block';
                } else {
                    modalImage.style.display = 'none';
                }
                modalContent.innerHTML = post.content; // Use innerHTML for rich text
                blogPostModal.show();
            } catch (error) {
                console.error('Error fetching single post:', error);
                alert('Could not load post details.');
            }
        }
    });

    fetchPosts();
});