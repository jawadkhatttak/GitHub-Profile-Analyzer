# GitHub Profile Analyzer

A web app that analyzes any GitHub profile and produces 
a visual breakdown of languages, top repositories, 
and a computed developer personality badge.

## Features
- Paginated GitHub API consumption with parallel fetching
- Language breakdown via reduce() aggregation
- Top starred repositories bar chart
- Rule-based developer personality engine
- 30-minute localStorage cache to respect API rate limits

## Technical Decisions
- **Why localStorage caching?** GitHub's unauthenticated API 
  allows 60 requests/hour. Paginated fetches burn multiple 
  requests per search. Caching with a 30-minute TTL keeps 
  the app usable without requiring authentication tokens.

- **Why Promise.all()?** User profile and repos are 
  independent requests. Running them in parallel cuts 
  load time roughly in half compared to sequential awaits.

## Stack
HTML · CSS · Vanilla JavaScript · Chart.js · GitHub REST API

## Live Demo
[link here](https://jawadkhatttak.github.io/GitHub-Profile-Analyzer/)
