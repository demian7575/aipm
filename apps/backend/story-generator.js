// Story generator - uses heuristics as fallback

export function generateInvestCompliantStory(idea, context = {}) {
  // Simple heuristic-based story generation
  const title = idea.length > 500 ? idea.substring(0, 497) + '...' : idea;
  const parent = context?.parent || null;
  const asA = parent?.asA || 'User';
  const soThat = 'I can accomplish my goals more effectively';
  
  // Generate description
  let description = `As a ${asA}, I want to ${idea.toLowerCase()}.`;
  if (soThat) {
    description += ` This ensures ${soThat.toLowerCase()}.`;
  }
  if (parent?.title) {
    description += ` This work supports the parent story "${parent.title}".`;
  }
  
  return {
    title,
    description,
    asA,
    iWant: idea,
    soThat,
    storyPoint: 3,
    components: parent?.components || [],
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
