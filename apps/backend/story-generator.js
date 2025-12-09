// Story generator - uses heuristics as fallback

function generateCompactTitle(idea) {
  // If idea is short enough, use it as-is
  if (idea.length <= 120) {
    return idea;
  }
  
  // Try to extract the main action/goal from the idea
  // Look for patterns like "I want to X" or "implement X"
  const patterns = [
    /(?:I want to|implement|create|add|build|enable|provide)\s+([^,.;]+)/i,
    /^([^,.;]+)/  // First clause before punctuation
  ];
  
  for (const pattern of patterns) {
    const match = idea.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length <= 120) {
        return extracted;
      }
      // If still too long, take first 117 chars at word boundary
      const shortened = extracted.substring(0, 117);
      const lastSpace = shortened.lastIndexOf(' ');
      return lastSpace > 80 ? shortened.substring(0, lastSpace) : shortened;
    }
  }
  
  // Fallback: take first sentence or first 117 chars at word boundary
  const firstSentence = idea.split(/[.!?]/)[0];
  if (firstSentence.length <= 120) {
    return firstSentence;
  }
  
  const shortened = idea.substring(0, 117);
  const lastSpace = shortened.lastIndexOf(' ');
  return lastSpace > 80 ? shortened.substring(0, lastSpace) : shortened;
}

export function generateInvestCompliantStory(idea, context = {}) {
  // Simple heuristic-based story generation
  const title = generateCompactTitle(idea);
  const parent = context?.parent || null;
  const asA = parent?.asA || 'User';
  const soThat = 'I can accomplish my goals more effectively';
  
  // Clean up the idea text for natural description
  let cleanIdea = idea.trim();
  
  // Remove common prefixes that would make the sentence awkward
  const prefixPatterns = [
    /^I want to\s+/i,
    /^As a .+ I want to\s+/i,
    /^to\s+/i
  ];
  
  for (const pattern of prefixPatterns) {
    cleanIdea = cleanIdea.replace(pattern, '');
  }
  
  // Ensure first letter is lowercase for proper sentence construction
  cleanIdea = cleanIdea.charAt(0).toLowerCase() + cleanIdea.slice(1);
  
  // Remove trailing period if present
  cleanIdea = cleanIdea.replace(/\.$/, '');
  
  // Generate description with natural grammar
  let description = `As a ${asA}, I want to ${cleanIdea}.`;
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
