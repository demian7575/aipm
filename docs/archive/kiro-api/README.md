# Archived KIRO API Documentation

This directory contains documentation for the old KIRO API architecture, which has been replaced by the Semantic API architecture.

## Historical Context

These documents describe the previous implementation where:
- KIRO API ran on various ports (8081, 8083)
- Direct Kiro CLI integration
- Different worker architecture

## Current Architecture

The current system uses:
- **Semantic API** (port 8083) - Handles AI code generation requests
- **Session Pool** (port 8082) - Manages Kiro CLI sessions
- **Backend API** (port 4000) - Main application API

## Reference Only

These documents are kept for historical reference and should not be used for current development. See the main documentation in the parent directory for current architecture.

## Files

- KIRO_API_*.md - Various KIRO API documentation
- KIRO_*.md - KIRO-related specifications and guides
- EC2_KIRO_WORKFLOW.md - Old workflow documentation
