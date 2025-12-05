// Story generator - uses heuristics as fallback

export function generateInvestCompliantStory(idea, parentStory) {
  // Simple heuristic-based story generation
  const title = idea.length > 80 ? idea.substring(0, 77) + '...' : idea;
  
  return {
    title,
    asA: parentStory?.asA || 'User',
    iWant: idea,
    soThat: 'I can accomplish my goals more effectively',
    storyPoint: 3,
    components: parentStory?.components || [],
    acceptanceCriteria: [
      'The feature works as described',
      'The user interface is intuitive',
      'The changes are properly tested'
    ]
  };
}

export function generateAcceptanceTest(story, ordinal) {
  return {
    title: `Acceptance Test ${ordinal}`,
    given: ['The system is in a known state', 'The user has appropriate permissions'],
    when: ['The user performs the action', 'The system processes the request'],
    then: ['The system displays the expected result', 'The changes are persisted', 'The user receives confirmation'],
    status: 'Draft'
  };
}
