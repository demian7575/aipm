import { readFileSync, writeFileSync } from 'fs';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let projectsCache = null;
let lastLoadTime = 0;
const CACHE_TTL = 60000; // 1 minute

export function loadProjects() {
  const now = Date.now();
  if (projectsCache && (now - lastLoadTime) < CACHE_TTL) {
    return projectsCache;
  }
  
  const configPath = join(__dirname, '../../config/projects.yaml');
  const content = readFileSync(configPath, 'utf-8');
  const config = yaml.parse(content);
  
  projectsCache = config.projects || [];
  lastLoadTime = now;
  
  return projectsCache;
}

export function getProject(projectId) {
  const projects = loadProjects();
  return projects.find(p => p.id === projectId);
}

export function addProject(project) {
  const projects = loadProjects();
  projects.push(project);
  saveProjects(projects);
  projectsCache = null;
}

export function updateProject(projectId, updates) {
  const projects = loadProjects();
  const index = projects.findIndex(p => p.id === projectId);
  if (index === -1) throw new Error('Project not found');
  
  projects[index] = { ...projects[index], ...updates };
  saveProjects(projects);
  projectsCache = null;
}

export function deleteProject(projectId) {
  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjects(filtered);
  projectsCache = null;
}

function saveProjects(projects) {
  const configPath = join(__dirname, '../../config/projects.yaml');
  const content = yaml.stringify({ projects });
  writeFileSync(configPath, content, 'utf-8');
}
