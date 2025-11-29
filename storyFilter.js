const storyList = document.querySelector('#story-list');
const statusFilter = document.querySelector('#status-filter');

statusFilter.addEventListener('change', () => {
  const selectedStatus = statusFilter.value;
  filterStories(selectedStatus);
});

function filterStories(status) {
  const stories = storyList.getElementsByClassName('story');
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    if (status === 'all' || story.dataset.status === status) {
      story.style.display = 'block';
    } else {
      story.style.display = 'none';
    }
  }
}