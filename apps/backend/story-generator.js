// Improved User Story and Acceptance Test Generation with INVEST principles

/**
 * Generate high-quality user story from idea using INVEST principles
 */
export function generateInvestCompliantStory(idea, context = {}) {
  const { parent } = context;
  
  // Parse the idea to extract intent
  const intent = parseUserIntent(idea);
  
  // Generate persona (Independent & Valuable)
  const persona = generatePersona(intent, parent);
  
  // Generate goal (Negotiable & Estimable)
  const goal = generateGoal(intent, parent);
  
  // Generate benefit (Valuable)
  const benefit = generateBenefit(intent, goal, parent);
  
  // Generate title (Small & Testable)
  const title = generateTitle(persona, goal);
  
  // Generate description with acceptance criteria hints
  const description = generateDescription(persona, goal, benefit, intent);
  
  // Estimate story points (Estimable)
  const storyPoint = estimateStoryPoints(goal, intent, parent);
  
  // Suggest components
  const components = suggestComponents(intent, parent);
  
  return {
    title,
    description,
    asA: persona,
    iWant: goal,
    soThat: benefit,
    components,
    storyPoint,
    assigneeEmail: parent?.assigneeEmail || '',
  };
}

/**
 * Parse user intent from idea text
 */
function parseUserIntent(idea) {
  const lower = idea.toLowerCase();
  
  return {
    action: extractAction(idea),
    subject: extractSubject(idea),
    context: extractContext(idea),
    isFeature: /\b(feature|functionality|capability|ability)\b/i.test(idea),
    isBugFix: /\b(fix|bug|issue|problem|error)\b/i.test(idea),
    isImprovement: /\b(improve|enhance|optimize|refactor)\b/i.test(idea),
    isUI: /\b(button|page|screen|ui|interface|display|show)\b/i.test(idea),
    isBackend: /\b(api|endpoint|database|server|backend|service)\b/i.test(idea),
    isIntegration: /\b(integrate|connect|sync|import|export)\b/i.test(idea),
  };
}

function extractAction(idea) {
  const actionWords = [
    'create', 'add', 'implement', 'build', 'develop',
    'view', 'see', 'display', 'show', 'list',
    'edit', 'update', 'modify', 'change',
    'delete', 'remove', 'hide',
    'search', 'filter', 'sort', 'find',
    'export', 'import', 'download', 'upload',
    'send', 'receive', 'notify', 'alert',
    'validate', 'verify', 'check', 'test'
  ];
  
  for (const word of actionWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(idea)) {
      return word;
    }
  }
  
  return 'manage';
}

function extractSubject(idea) {
  // Extract main noun/subject, skipping action words
  const actionWords = [
    'create', 'add', 'implement', 'build', 'develop',
    'view', 'see', 'display', 'show', 'list',
    'edit', 'update', 'modify', 'change',
    'delete', 'remove', 'hide',
    'search', 'filter', 'sort', 'find',
    'export', 'import', 'download', 'upload',
    'send', 'receive', 'notify', 'alert',
    'validate', 'verify', 'check', 'test'
  ];
  
  const words = idea.split(/\s+/).filter(w => w.length > 2);
  
  // Find first word that's not an action word
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!actionWords.includes(lower) && !/^(the|and|for|with|from|to|a|an)$/i.test(lower)) {
      return word;
    }
  }
  
  // Fallback: use words after the action
  const firstAction = words.findIndex(w => 
    actionWords.includes(w.toLowerCase().replace(/[^a-z]/g, ''))
  );
  
  if (firstAction >= 0 && firstAction < words.length - 1) {
    // Return the rest of the phrase after the action
    return words.slice(firstAction + 1).join(' ');
  }
  
  return words[0] || 'feature';
}

function extractContext(idea) {
  if (idea.length < 50) return '';
  return idea.substring(0, 100) + (idea.length > 100 ? '...' : '');
}

/**
 * Generate appropriate persona based on intent
 */
function generatePersona(intent, parent) {
  if (parent?.asA && parent.asA !== 'User') {
    return parent.asA;
  }
  
  // Determine persona based on intent
  if (intent.isBackend || intent.isIntegration) {
    return 'Developer';
  }
  if (intent.isUI) {
    return 'User';
  }
  if (/admin|manage|configure/i.test(intent.context)) {
    return 'Administrator';
  }
  if (/project|story|task/i.test(intent.context)) {
    return 'Project Manager';
  }
  
  return 'User';
}

/**
 * Generate clear, actionable goal
 */
function generateGoal(intent, parent) {
  const action = intent.action;
  const subject = intent.subject;
  
  // Create specific, actionable goal
  let goal = `${action} ${subject}`;
  
  // Only add context if it adds value and isn't redundant
  const needsContext = subject.length < 10 && !intent.isUI && !intent.isBackend;
  
  if (needsContext) {
    if (intent.isUI) {
      goal += ' in the interface';
    } else if (intent.isBackend) {
      goal += ' via API';
    }
  }
  
  // Ensure it's not too implementation-specific (Negotiable)
  goal = goal.replace(/\b(using|with|via|through)\s+\w+\s+(library|framework|tool)\b/gi, '');
  
  return goal.charAt(0).toLowerCase() + goal.slice(1);
}

/**
 * Generate clear business benefit
 */
function generateBenefit(intent, goal, parent) {
  if (parent?.soThat && parent.soThat !== 'I can accomplish my goals more effectively') {
    return parent.soThat;
  }
  
  // Generate specific benefit based on intent
  if (intent.isBugFix) {
    return 'the system works correctly and reliably';
  }
  if (intent.isImprovement) {
    return 'the system is more efficient and easier to use';
  }
  if (intent.isUI) {
    return 'I can complete my tasks quickly and intuitively';
  }
  if (intent.isBackend) {
    return 'the system can process requests efficiently and accurately';
  }
  if (intent.isIntegration) {
    return 'data flows seamlessly between systems';
  }
  
  // Default benefit based on action
  const actionBenefits = {
    create: 'I can add new information to the system',
    view: 'I can access the information I need',
    edit: 'I can keep information up to date',
    delete: 'I can remove outdated information',
    search: 'I can find information quickly',
    export: 'I can use data in other tools',
  };
  
  return actionBenefits[intent.action] || 'I can accomplish my work more effectively';
}

/**
 * Generate concise, descriptive title
 */
function generateTitle(persona, goal) {
  // Title should be short and descriptive (Small principle)
  // Capitalize first letter and keep it concise
  let title = goal.trim();
  
  // Remove redundant phrases
  title = title.replace(/\s+in the interface$/i, '');
  title = title.replace(/\s+via API$/i, '');
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Limit length
  const words = title.split(/\s+/);
  if (words.length > 6) {
    title = words.slice(0, 6).join(' ') + '...';
  }
  
  return title;
}

/**
 * Generate description with acceptance criteria hints
 */
function generateDescription(persona, goal, benefit, intent) {
  const desc = `As a ${persona}, I want to ${goal}, so that ${benefit}.`;
  
  // Add acceptance criteria hints (Testable principle)
  const hints = [];
  
  if (intent.isUI) {
    hints.push('- UI element is visible and accessible');
    hints.push('- User can interact with the feature');
    hints.push('- Appropriate feedback is provided');
  }
  
  if (intent.isBackend) {
    hints.push('- API endpoint responds correctly');
    hints.push('- Data is validated and processed');
    hints.push('- Errors are handled appropriately');
  }
  
  if (hints.length > 0) {
    return desc + '\n\nAcceptance Criteria:\n' + hints.join('\n');
  }
  
  return desc;
}

/**
 * Estimate story points based on complexity
 */
function estimateStoryPoints(goal, intent, parent) {
  let points = 3; // Default medium complexity
  
  // Adjust based on intent
  if (intent.isUI && !intent.isBackend) {
    points = 2; // UI-only is usually simpler
  }
  if (intent.isIntegration) {
    points = 5; // Integrations are complex
  }
  if (intent.isBugFix) {
    points = 2; // Bug fixes are usually smaller
  }
  
  // Consider parent story points
  if (parent?.storyPoint && parent.storyPoint > 1) {
    points = Math.max(1, Math.min(8, Math.round(parent.storyPoint / 2)));
  }
  
  return points;
}

/**
 * Suggest appropriate components
 */
function suggestComponents(intent, parent) {
  if (parent?.components?.length > 0) {
    return parent.components;
  }
  
  const components = [];
  
  if (intent.isUI) components.push('User_Experience');
  if (intent.isBackend) components.push('System');
  if (intent.isIntegration) components.push('Orchestration_Engagement');
  if (/test|verify|validate/i.test(intent.context)) components.push('Run_Verify');
  if (/document|report/i.test(intent.context)) components.push('Traceability_Insight');
  
  return components.length > 0 ? components : [];
}

/**
 * Generate acceptance test with Given-When-Then
 */
export function generateAcceptanceTest(story) {
  const { asA, iWant, soThat } = story;
  
  // Parse action from goal
  const action = extractAction(iWant);
  const subject = extractSubject(iWant);
  
  return {
    title: `Verify ${action} ${subject} functionality`,
    given: [
      `${asA} is authenticated`,
      `System is in ready state`,
      `Required permissions are granted`
    ],
    when: [
      `${asA} attempts to ${action} ${subject}`,
      `System processes the request`
    ],
    then: [
      `${subject} is ${action}ed successfully`,
      `Appropriate confirmation is displayed`,
      `System state is updated correctly`
    ]
  };
}
