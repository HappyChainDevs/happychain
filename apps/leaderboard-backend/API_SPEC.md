# Leaderboard Backend API Specification

## Overview

This document details the REST API for the Leaderboard backend. It describes endpoints, request/response schemas, and validation rules for managing users, guilds, games, and leaderboards.

---

## Entities

### User

| Field         | Type    | Required on Create | Updatable | Nullable | Description                      |
|---------------|---------|-------------------|-----------|-----------|----------------------------------|
| happy_wallet  | string  | Yes               | No        | No        | User's wallet address (ID)       |
| username      | string  | Yes               | Yes       | No        | User's display name              |
| guild_id      | number  | No                | Yes       | Yes       | Guild the user belongs to        |
| created_at    | string  | No (set by DB)    | No        | No        | User creation timestamp          |

### Guild

| Field      | Type    | Required on Create | Updatable | Nullable | Description                       |
|------------|---------|-------------------|-----------|----------|-----------------------------------|
| id         | number  | No (set by DB)    | No        | No       | Guild's unique identifier         |
| name       | string  | Yes               | Yes       | No       | Guild name (must be unique)       |
| admin_id   | number  | Yes               | Yes       | No       | User ID of guild admin            |
| created_at | string  | No (set by DB)    | No        | No       | Guild creation timestamp (ISO8601)|
