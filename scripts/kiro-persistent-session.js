#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_CHAT_URL = 'http://44.220.45.57:8084/kiro/chat';
const args = process.argv.slice(2);

function getArg(flag, fallback = null) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return fallback;
}

const once = args.includes('--once');
const dryRun = args.includes('--dry-run');
const chatUrl = process.env.KIRO_CHAT_URL || getArg('--url', DEFAULT_CHAT_URL);
const intervalSeconds = Number.parseInt(getArg('--interval', '60'), 10);
const storyId = getArg('--story') || process.env.KIRO_STORY_ID || null;
const context = getArg('--context') || process.env.KIRO_CONTEXT || null;

if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
  console.error('❌ Invalid --interval value. Provide a positive integer (seconds).');
  process.exit(1);
}

function buildPayload() {
  return {
    message: 'ping',
    meta: {
      reason: 'keepalive',
      storyId,
      context,
      timestamp: new Date().toISOString()
    }
  };
}

async function sendHeartbeat() {
  const payload = buildPayload();
  if (dryRun) {
    console.log('🔬 Dry run: would POST to', chatUrl, 'with payload', JSON.stringify(payload));
    return { ok: true, status: 0, body: 'dry-run' };
  }

  try {
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });

    const text = await response.text();
    const trimmed = text.length > 500 ? `${text.slice(0, 500)}…` : text;
    console.log(`📡 Heartbeat → ${response.status} ${response.statusText || ''}`.trim());
    if (trimmed) {
      console.log('   Response:', trimmed);
    }

    return { ok: response.ok, status: response.status, body: text };
  } catch (error) {
    console.error('⚠️  Heartbeat failed:', error.message || error);
    return { ok: false, status: 0, body: null };
  }
}

async function main() {
  console.log('📟 Starting Kiro persistent session heartbeat');
  console.log('   Endpoint:', chatUrl);
  console.log('   Interval:', `${intervalSeconds}s`);
  if (storyId) console.log('   Story ID:', storyId);
  if (context) console.log('   Context:', context);
  if (dryRun) console.log('   Mode: dry run (no network requests)');

  do {
    await sendHeartbeat();
    if (once) break;
    await delay(intervalSeconds * 1000);
  } while (true);
}

main().catch((error) => {
  console.error('❌ Unexpected error in persistent session runner:', error);
  process.exit(1);
});
