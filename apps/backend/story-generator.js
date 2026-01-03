// Minimal story generator functions
export function generateInvestCompliantStory(idea, parentId = null) {
  return {
    storyId: `story-${Date.now()}`,
    title: idea.charAt(0).toUpperCase() + idea.slice(1),
    description: `Implement ${idea.toLowerCase()} functionality`,
    asA: 'system user',
    iWant: `to ${idea.toLowerCase()}`,
    soThat: 'I can accomplish my goals effectively',
    acceptanceCriteria: [
      `System successfully implements ${idea.toLowerCase()}`,
      'User interface is intuitive and responsive'
    ],
    components: [],
    assigneeEmail: '',
    status: 'Draft',
    storyPoints: 0,
    parentId: parentId
  };
}

export function generateAcceptanceTest(story) {
  return {
    id: `test-${Date.now()}`,
    storyId: story.storyId,
    title: `Test ${story.title}`,
    given: [`User has access to ${story.title.toLowerCase()}`],
    when: [`User attempts to ${story.iWant.toLowerCase()}`],
    then: ['System responds appropriately', 'User achieves desired outcome'],
    status: 'Draft'
  };
}
